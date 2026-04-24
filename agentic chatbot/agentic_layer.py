import os
import random
from typing import TypedDict, Optional, Dict, Any

import pandas as pd
from langgraph.graph import END, StateGraph

from comparison_logic import compare_districts
from explanation_layer import build_explanation_data, generate_explanation_with_gemini
from realestate_data import load_district_dataframe

df_merged = load_district_dataframe()
district_names = df_merged["district"].dropna().astype(str).str.lower().tolist()


class AgentState(TypedDict):
    user_input: str
    school_weight: float
    crime_weight: float
    price_weight: float
    district_a: Optional[str]
    district_b: Optional[str]
    intent: Optional[str]
    result: Optional[Dict[str, Any]]
    response: Optional[str]


def normalize_weights(school_weight, crime_weight, price_weight):
    total = school_weight + crime_weight + price_weight
    if total == 0:
        return 40, 35, 25
    return (
        round((school_weight / total) * 100, 2),
        round((crime_weight / total) * 100, 2),
        round((price_weight / total) * 100, 2),
    )


def find_districts_in_text(text, district_list):
    text = text.lower()
    found = []
    for d in district_list:
        if d in text:
            found.append(d)
    return found


# ---------------------------------------------------------------------------
# Conversational intent detection
# ---------------------------------------------------------------------------

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

_vader = SentimentIntensityAnalyzer()

COST_KEYWORDS    = ["expensive", "pricey", "cost", "afford", "cheap", "budget", "price", "too much"]
SAFETY_KEYWORDS  = ["unsafe", "dangerous", "crime", "sketchy", "safe", "safety"]
SCHOOL_KEYWORDS  = ["school", "isd", "district", "education", "rating", "teachers"]
QUESTION_TRIGGERS = ["what do you think", "thoughts on", "tell me more", "why is", "is it worth",
                     "what about", "how about", "any thoughts", "what's wrong", "whats wrong",
                     "heard that", "people say", "should i", "is it good", "is it bad"]

CONVERSATIONAL_TRIGGERS = COST_KEYWORDS + SAFETY_KEYWORDS + SCHOOL_KEYWORDS + QUESTION_TRIGGERS + [
    "don't like", "dont like", "dislike", "hate", "not a fan", "not happy",
    "love", "prefer", "great", "amazing", "i like",
]


def _is_conversational(text: str) -> bool:
    return any(trigger in text for trigger in CONVERSATIONAL_TRIGGERS)


def _detect_sentiment(text: str) -> str:
    """
    Use VADER for overall positive/negative sentiment, then layer on
    topic detection for cost/safety/school so we can give a specific response.
    Returns: 'negative', 'positive', 'cost', 'safety', 'school', or 'general'
    """
    # Topic detection takes priority — gives more useful responses
    if any(k in text for k in COST_KEYWORDS):
        scores = _vader.polarity_scores(text)
        # "not expensive" should be positive, "too expensive" negative
        return "cost"
    if any(k in text for k in SAFETY_KEYWORDS):
        return "safety"
    if any(k in text for k in SCHOOL_KEYWORDS):
        scores = _vader.polarity_scores(text)
        return "negative" if scores["compound"] < -0.05 else "school"

    # Fall back to pure VADER sentiment
    scores = _vader.polarity_scores(text)
    if scores["compound"] <= -0.05:
        return "negative"
    if scores["compound"] >= 0.05:
        return "positive"
    return "general"


def _conversational_response(user_input: str) -> str:
    """
    Build a natural-sounding response without any API call.
    Detects sentiment + mentioned district and picks from varied templates.
    """
    text = user_input.lower()
    sentiment = _detect_sentiment(text)

    # Find any district mentioned
    mentioned = find_districts_in_text(text, district_names)
    district = mentioned[0].title() if mentioned else None

    # Suggest alternatives based on mentioned district
    alternatives = [d.title() for d in district_names if d != (district or "").lower()]
    alt1 = alternatives[0] if len(alternatives) > 0 else "Frisco"
    alt2 = alternatives[1] if len(alternatives) > 1 else "Plano"

    if sentiment == "negative" and district:
        responses = [
            f"Totally understandable — {district} isn't for everyone. Want me to compare it against {alt1} or {alt2} so you can see your options side by side?",
            f"Fair enough on {district}. If you tell me what matters most to you — schools, safety, or price — I can point you toward a better fit.",
            f"Got it. If {district} is off the table, {alt1} and {alt2} are both worth a look. Want a comparison?",
        ]

    elif sentiment == "positive" and district:
        responses = [
            f"Glad {district} is on your radar! Want me to compare it against another district to see how it stacks up?",
            f"{district} is a solid choice. I can run a full comparison against {alt1} or {alt2} if you want the numbers.",
            f"Good pick. Want to see how {district} compares to {alt1} on schools, safety, and price?",
        ]

    elif sentiment == "cost" and district:
        responses = [
            f"Price is a real factor in {district}. Want me to compare it against {alt1} to see the affordability gap?",
            f"If affordability is your main concern, I'd suggest comparing {district} vs {alt1} — the price difference might surprise you.",
            f"Cost matters — want me to run a comparison with affordability weighted highest to find the best value district?",
        ]

    elif sentiment == "cost":
        responses = [
            f"If budget is your top priority, try asking: 'Compare Frisco vs Plano with affordability weighted highest' to find the best value.",
            f"I can factor price heavily into any comparison. Just say which two districts you're weighing.",
        ]

    elif sentiment == "safety" and district:
        responses = [
            f"Safety is a valid concern. Want me to compare {district} against {alt1} with safety weighted highest?",
            f"I can run a safety-focused comparison for {district}. Which district would you like to compare it against?",
        ]

    elif sentiment == "school" and district:
        responses = [
            f"School quality is huge for families. Want a school-focused comparison between {district} and {alt1}?",
            f"I can weight schools highest in the comparison. Just say which two districts to compare.",
        ]

    else:
        responses = [
            f"I can compare any two DFW districts on schools, safety, and affordability. Try: 'Compare Frisco vs Plano' or 'Which district is best for families?'",
            f"Good question. I work best when comparing two districts — try something like 'Compare Allen vs Prosper' and I'll break it down for you.",
            f"I'm set up to compare districts, rank them, or recommend one based on your priorities. What are you trying to figure out?",
        ]

    return random.choice(responses)


# ---------------------------------------------------------------------------
# Graph nodes
# ---------------------------------------------------------------------------

def route_intent(state: AgentState):
    text = state["user_input"].lower()

    if _is_conversational(text):
        state["intent"] = "clarify"
        return state

    found = find_districts_in_text(text, district_names)

    district_a = state.get("district_a")
    district_b = state.get("district_b")

    if not district_a and len(found) >= 1:
        district_a = found[0]
    if not district_b and len(found) >= 2:
        district_b = found[1]

    state["district_a"] = district_a
    state["district_b"] = district_b

    if "rank" in text or "all districts" in text:
        state["intent"] = "rank"
    elif district_a and district_b:
        state["intent"] = "compare"
    elif "best" in text or "recommend" in text or "which district" in text:
        state["intent"] = "recommend"
    else:
        state["intent"] = "clarify"

    return state


def compare_node(state: AgentState):
    school_weight, crime_weight, price_weight = normalize_weights(
        state["school_weight"], state["crime_weight"], state["price_weight"]
    )
    result = compare_districts(
        state["district_a"],
        state["district_b"],
        df_merged,
        school_weight,
        crime_weight,
        price_weight,
    )
    state["result"] = result
    return state


def rank_node(state: AgentState):
    school_weight, crime_weight, price_weight = normalize_weights(
        state["school_weight"], state["crime_weight"], state["price_weight"]
    )
    sw, cw, pw = school_weight / 100, crime_weight / 100, price_weight / 100
    temp = df_merged.copy()
    temp["overall_score"] = (
        temp["school_composite"] * sw
        + temp["crime_composite"] * cw
        + temp["price_composite"] * pw
    )
    ranked = temp.sort_values("overall_score", ascending=False)[
        ["district", "school_composite", "crime_composite", "price_composite", "overall_score"]
    ].reset_index(drop=True)
    state["result"] = {"ranking": ranked.head(10).to_dict(orient="records")}
    return state


def recommend_node(state: AgentState):
    school_weight, crime_weight, price_weight = normalize_weights(
        state["school_weight"], state["crime_weight"], state["price_weight"]
    )
    sw, cw, pw = school_weight / 100, crime_weight / 100, price_weight / 100
    temp = df_merged.copy()
    temp["overall_score"] = (
        temp["school_composite"] * sw
        + temp["crime_composite"] * cw
        + temp["price_composite"] * pw
    )
    best = temp.sort_values("overall_score", ascending=False).iloc[0]
    state["result"] = {
        "best_district": best["district"],
        "school_score": best["school_composite"],
        "crime_score": best["crime_composite"],
        "price_score": best["price_composite"],
        "overall_score": best["overall_score"],
    }
    return state


def response_node(state: AgentState):
    intent = state["intent"]
    result = state["result"]

    if intent == "compare":
        if result is None or (isinstance(result, dict) and "error" in result):
            state["response"] = _conversational_response(state["user_input"])
            return state

        explanation_data = build_explanation_data(
            state["district_a"],
            state["district_b"],
            result,
            state["school_weight"],
            state["crime_weight"],
            state["price_weight"],
        )
        explanation_json = generate_explanation_with_gemini(explanation_data)

        parts = []
        if explanation_json.get("tldr"):
            parts.append(explanation_json["tldr"])
        parts += [
            explanation_json["school_sentence"],
            explanation_json["safety_sentence"],
            explanation_json["affordability_sentence"],
            explanation_json["overall_sentence"],
        ]
        if explanation_json.get("best_for"):
            parts.append(f"\n{explanation_json['best_for']}")

        state["response"] = "\n".join(parts)

    elif intent == "rank":
        ranking = result["ranking"]
        lines = ["Here are the top districts based on your current weights:"]
        for i, row in enumerate(ranking[:5], start=1):
            lines.append(f"{i}. {row['district'].title()} — overall {row['overall_score']:.3f}")
        state["response"] = "\n".join(lines)

    elif intent == "recommend":
        best = result["best_district"].title()
        responses = [
            f"Based on your weights, {best} is your strongest match. School: {result['school_score']:.3f} · Safety: {result['crime_score']:.3f} · Affordability: {result['price_score']:.3f}",
            f"{best} comes out on top with your current priorities. Schools: {result['school_score']:.3f}, Safety: {result['crime_score']:.3f}, Price: {result['price_score']:.3f}",
            f"With those weights, {best} is the best fit overall. It scores {result['school_score']:.3f} on schools, {result['crime_score']:.3f} on safety, and {result['price_score']:.3f} on affordability.",
        ]
        state["response"] = random.choice(responses)

    else:
        state["response"] = _conversational_response(state["user_input"])

    return state


def route_after_intent(state: AgentState):
    return state["intent"]


graph = StateGraph(AgentState)

graph.add_node("route_intent", route_intent)
graph.add_node("compare", compare_node)
graph.add_node("rank", rank_node)
graph.add_node("recommend", recommend_node)
graph.add_node("respond", response_node)

graph.set_entry_point("route_intent")

graph.add_conditional_edges(
    "route_intent",
    route_after_intent,
    {
        "compare": "compare",
        "rank": "rank",
        "recommend": "recommend",
        "clarify": "respond",
    },
)

graph.add_edge("compare", "respond")
graph.add_edge("rank", "respond")
graph.add_edge("recommend", "respond")
graph.add_edge("respond", END)

opportunity_agent = graph.compile()


def run_opportunity_agent(
    user_input,
    school_weight,
    crime_weight,
    price_weight,
    district_a=None,
    district_b=None,
):
    school_weight, crime_weight, price_weight = normalize_weights(
        school_weight, crime_weight, price_weight
    )
    state = {
        "user_input": user_input,
        "school_weight": school_weight,
        "crime_weight": crime_weight,
        "price_weight": price_weight,
        "district_a": district_a.lower() if district_a else None,
        "district_b": district_b.lower() if district_b else None,
        "intent": None,
        "result": None,
        "response": None,
    }
    final_state = opportunity_agent.invoke(state)
    return final_state["response"]
