import os
from typing import TypedDict, Optional, Dict, Any

from langgraph.graph import StateGraph, END

from comparison_logic import compare_districts

from realestate_data import load_district_dataframe
from openai import OpenAI


# ---------------- LOAD DATA ----------------

df = load_district_dataframe()
districts = df["district"].dropna().astype(str).str.lower().tolist()


# ---------------- STATE ----------------

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
    history: list


# ---------------- HELPERS ----------------

COMPARE_KEYWORDS = {"compare", "vs", "versus", "between", "better", "difference"}

def is_greeting(text: str) -> bool:
    return text.strip().lower() in ["hi", "hello", "hey", "yo"]

def is_compare_request(text: str) -> bool:
    return any(kw in text.lower() for kw in COMPARE_KEYWORDS)

def extract_districts(text: str):
    text = text.lower()
    return [d for d in districts if d in text]


# ---------------- ROUTER ----------------

def route(state: AgentState):

    text = state["user_input"].lower()

    if is_greeting(text):
        state["intent"] = "chat"
        return state

    found = extract_districts(text)

    # Use pre-set districts only when the message is actually a compare request;
    # for generic chat ("thank you", etc.) ignore the pre-set districts.
    if is_compare_request(text) or len(found) >= 2:
        district_a = state.get("district_a") or (found[0] if len(found) > 0 else None)
        district_b = state.get("district_b") or (found[1] if len(found) > 1 else None)
        if district_a and district_b:
            state["district_a"] = district_a
            state["district_b"] = district_b
            state["intent"] = "compare"
            return state

    if "best" in text or "recommend" in text:
        state["intent"] = "recommend"
    else:
        state["intent"] = "chat"

    return state


# ---------------- COMPARE ----------------

def compare_node(state: AgentState):

    state["result"] = compare_districts(
        state["district_a"],
        state["district_b"],
        df,
        state["school_weight"],
        state["crime_weight"],
        state["price_weight"],
    )

    return state


# ---------------- LLM CHAT ----------------

def generate_chat_response(context: Dict[str, Any]) -> str:

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    # Find the most recent comparison result in history for follow-up context
    last_comparison = ""
    for msg in reversed(context.get("history", [])):
        if isinstance(msg, dict) and msg.get("role") == "assistant":
            content = msg.get("content", "")
            if content.startswith("Here is the weighted comparison"):
                last_comparison = content
                break

    system_prompt = (
        "You are a real estate decision assistant. "
        "You help users compare and understand cities in a natural, conversational way. "
        "Respond naturally — if the user says thanks, reply warmly. "
        "If they ask a follow-up question, answer it using the comparison context below. "
        "Keep replies to 1–3 sentences. No JSON."
    )
    if last_comparison:
        system_prompt += f"\n\nMost recent comparison result:\n{last_comparison}"

    messages = [{"role": "system", "content": system_prompt}]
    for msg in context.get("history", [])[1:]:  # skip intro message
        if isinstance(msg, dict) and msg.get("role") in ("user", "assistant"):
            messages.append({"role": msg["role"], "content": msg.get("content", "")})
    messages.append({"role": "user", "content": context.get("user_input", "")})

    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        messages=messages,
    )

    return response.choices[0].message.content.strip() or "Let me know how you'd like to compare cities."


# ---------------- CHAT NODE ----------------

def chat_node(state: AgentState):

    context = {
        "intent": state.get("intent"),
        "user_input": state["user_input"],
        "district_a": state.get("district_a"),
        "district_b": state.get("district_b"),
        "history": state.get("history", []),
    }

    state["response"] = generate_chat_response(context)
    return state


# ---------------- COMPARISON FORMATTER ----------------

def _format_comparison(city_a, city_b, result, school_weight, crime_weight, price_weight):
    sw = school_weight / 100
    cw = crime_weight / 100
    pw = price_weight / 100

    school_a_w = result["school_A"] * sw
    school_b_w = result["school_B"] * sw
    crime_a_w  = result["crime_A"]  * cw
    crime_b_w  = result["crime_B"]  * cw
    price_a_w  = result["price_A"]  * pw
    price_b_w  = result["price_B"]  * pw

    a = city_a.title()
    b = city_b.title()

    school_winner, school_loser = (a, b) if school_a_w >= school_b_w else (b, a)
    crime_winner,  crime_loser  = (a, b) if crime_a_w  >= crime_b_w  else (b, a)
    price_winner,  price_loser  = (a, b) if price_a_w  >= price_b_w  else (b, a)

    overall_a = result["overall_A"]
    overall_b = result["overall_B"]
    overall_winner = a if overall_a >= overall_b else b

    return "\n".join([
        "Here is the weighted comparison using your current priorities.",
        f"Given your school weight, {school_winner}'s school contribution is stronger than {school_loser}'s by {abs(school_a_w - school_b_w):.3f} weighted points.",
        f"Given your safety weight, {crime_winner}'s safety contribution is stronger than {crime_loser}'s by {abs(crime_a_w - crime_b_w):.3f} weighted points.",
        f"Given your affordability weight, {price_winner}'s affordability contribution is stronger than {price_loser}'s by {abs(price_a_w - price_b_w):.3f} weighted points.",
        f"Weighted scoring used: School {school_weight:.0f}%, Safety {crime_weight:.0f}%, Affordability {price_weight:.0f}%",
        f"Weighted totals -> {a}: {overall_a:.3f} (school {school_a_w:.3f}, safety {crime_a_w:.3f}, affordability {price_a_w:.3f}); {b}: {overall_b:.3f} (school {school_b_w:.3f}, safety {crime_b_w:.3f}, affordability {price_b_w:.3f}).",
        f"Based on these weights, {overall_winner} is the stronger overall match by {abs(overall_a - overall_b):.3f} points.",
    ])


# ---------------- RESPONDER ----------------

def respond(state: AgentState):

    try:

        # ---------------- CHAT EVERYTHING EXCEPT COMPARE ----------------
        if state["intent"] in ["chat", "recommend"]:
            return chat_node(state)

        # ---------------- COMPARE ----------------
        if state["intent"] == "compare":
            state["response"] = _format_comparison(
                state["district_a"],
                state["district_b"],
                state["result"],
                state["school_weight"],
                state["crime_weight"],
                state["price_weight"],
            )
            return state

        # fallback → still LLM
        return chat_node(state)

    except Exception as e:
        print("AGENT ERROR:", e)

        state["response"] = generate_chat_response({
            "intent": "error",
            "user_input": state["user_input"],
            "district_a": state.get("district_a"),
            "district_b": state.get("district_b"),
        })

        return state


# ---------------- GRAPH ----------------

graph = StateGraph(AgentState)

graph.add_node("route", route)
graph.add_node("compare", compare_node)
graph.add_node("respond", respond)
graph.add_node("chat", chat_node)

graph.set_entry_point("route")


graph.add_conditional_edges(
    "route",
    lambda s: s["intent"],
    {
        "compare": "compare",
        "chat": "respond",
        "recommend": "respond",
    },
)

graph.add_edge("compare", "respond")
graph.add_edge("respond", END)
graph.add_edge("chat", END)

agent = graph.compile()


# ---------------- RUNNER ----------------

def run_opportunity_agent(
    user_input,
    school_weight,
    crime_weight,
    price_weight,
    district_a=None,
    district_b=None,
    history=None,
):

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
        "history": history or [],
    }

    result = agent.invoke(state)
    return result["response"]