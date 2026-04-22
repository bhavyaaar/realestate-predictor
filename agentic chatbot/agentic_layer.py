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

def route_intent(state: AgentState):
    text = state["user_input"].lower()

    found = find_districts_in_text(text, district_names)

    # If UI dropdowns already passed districts, keep those
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

    district_a = state["district_a"]
    district_b = state["district_b"]

    result = compare_districts(
        district_a,
        district_b,
        df_merged,
        school_weight,
        crime_weight,
        price_weight
    )

    state["result"] = result
    return state

def rank_node(state: AgentState):
    school_weight, crime_weight, price_weight = normalize_weights(
        state["school_weight"], state["crime_weight"], state["price_weight"]
    )

    sw = school_weight / 100
    cw = crime_weight / 100
    pw = price_weight / 100

    temp = df_merged.copy()

    temp["overall_score"] = (
        temp["school_composite"] * sw +
        temp["crime_composite"] * cw +
        temp["price_composite"] * pw
    )

    ranked = temp.sort_values("overall_score", ascending=False)[
        ["district", "school_composite", "crime_composite", "price_composite", "overall_score"]
    ].reset_index(drop=True)

    state["result"] = {
        "ranking": ranked.head(10).to_dict(orient="records")
    }
    return state

def recommend_node(state: AgentState):
    school_weight, crime_weight, price_weight = normalize_weights(
        state["school_weight"], state["crime_weight"], state["price_weight"]
    )

    sw = school_weight / 100
    cw = crime_weight / 100
    pw = price_weight / 100

    temp = df_merged.copy()

    temp["overall_score"] = (
        temp["school_composite"] * sw +
        temp["crime_composite"] * cw +
        temp["price_composite"] * pw
    )

    best = temp.sort_values("overall_score", ascending=False).iloc[0]

    state["result"] = {
        "best_district": best["district"],
        "school_score": best["school_composite"],
        "crime_score": best["crime_composite"],
        "price_score": best["price_composite"],
        "overall_score": best["overall_score"]
    }
    return state

def response_node(state: AgentState):
    intent = state["intent"]
    result = state["result"]

    if intent == "compare":
        if result is None or (isinstance(result, dict) and "error" in result):
            state["response"] = "I couldn’t compare those districts. Please make sure both district names are valid."
            return state

        explanation_data = build_explanation_data(
            state["district_a"],
            state["district_b"],
            result,
            state["school_weight"],
            state["crime_weight"],
            state["price_weight"]
        )

        explanation_json = generate_explanation_with_gemini(explanation_data)

        state["response"] = (
            f"{explanation_json['school_sentence']}\n"
            f"{explanation_json['safety_sentence']}\n"
            f"{explanation_json['affordability_sentence']}\n"
            f"{explanation_json['overall_sentence']}"
        )

    elif intent == "rank":
        ranking = result["ranking"]
        lines = ["Top districts based on your current weights:"]
        for i, row in enumerate(ranking[:5], start=1):
            lines.append(
                f"{i}. {row['district'].title()} — overall {row['overall_score']:.3f}"
            )
        state["response"] = "\n".join(lines)

    elif intent == "recommend":
        state["response"] = (
            f"Based on your current weights, the best match is {result['best_district'].title()}.\n"
            f"School: {result['school_score']:.3f}, "
            f"Safety: {result['crime_score']:.3f}, "
            f"Affordability: {result['price_score']:.3f}, "
            f"Overall: {result['overall_score']:.3f}"
        )

    else:
        state["response"] = (
            "I can compare two districts, rank all districts, or recommend one district.\n"
            "Try: 'Compare Frisco vs Plano' or 'Rank all districts for families.'"
        )

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
        "clarify": "respond"
    }
)

graph.add_edge("compare", "respond")
graph.add_edge("rank", "respond")
graph.add_edge("recommend", "respond")
graph.add_edge("respond", END)

opportunity_agent = graph.compile()

def run_opportunity_agent(user_input, school_weight, crime_weight, price_weight, district_a=None, district_b=None):
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
        "response": None
    }

    final_state = opportunity_agent.invoke(state)
    return final_state["response"]