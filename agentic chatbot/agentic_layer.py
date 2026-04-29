import os
from typing import TypedDict, Optional, Dict, Any

from langgraph.graph import StateGraph, END

from comparison_logic import compare_districts
from explanation_layer import (
    build_explanation_data,
    generate_explanation
)
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


# ---------------- HELPERS ----------------

def is_greeting(text: str) -> bool:
    return text.strip().lower() in ["hi", "hello", "hey", "yo"]


def extract_districts(text: str):
    text = text.lower()
    return [d for d in districts if d in text]


# ---------------- ROUTER ----------------

def route(state: AgentState):

    text = state["user_input"].lower()

    # greeting → LLM handles later
    if is_greeting(text):
        state["intent"] = "chat"
        return state

    found = extract_districts(text)

    state["district_a"] = found[0] if len(found) > 0 else None
    state["district_b"] = found[1] if len(found) > 1 else None

    if state["district_a"] and state["district_b"]:
        state["intent"] = "compare"

    elif "best" in text or "recommend" in text:
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

    prompt = f"""
You are a real estate decision assistant.

You help users compare and understand cities in a natural, conversational way.

Context:
- intent: {context.get("intent")}
- user_input: {context.get("user_input")}
- district_a: {context.get("district_a")}
- district_b: {context.get("district_b")}

Rules:
- Respond naturally like a helpful human assistant
- If user says thanks → respond naturally (not scripted)
- If user asks follow-up → continue contextually
- If unclear → ask a clarifying question
- Keep it 1–3 sentences max
- No JSON
"""

    response = client.responses.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        input=prompt
    )

    text = ""
    for item in response.output:
        if hasattr(item, "content"):
            for c in item.content:
                if hasattr(c, "text"):
                    text += c.text

    return text.strip() or "Let me know how you'd like to compare cities."


# ---------------- CHAT NODE ----------------

def chat_node(state: AgentState):

    context = {
        "intent": state.get("intent"),
        "user_input": state["user_input"],
        "district_a": state.get("district_a"),
        "district_b": state.get("district_b"),
    }

    state["response"] = generate_chat_response(context)
    return state


# ---------------- RESPONDER ----------------

def respond(state: AgentState):

    try:

        # ---------------- CHAT EVERYTHING EXCEPT COMPARE ----------------
        if state["intent"] in ["chat", "recommend"]:
            return chat_node(state)

        # ---------------- COMPARE ----------------
        if state["intent"] == "compare":

            data = build_explanation_data(
                state["district_a"],
                state["district_b"],
                state["result"],
                state["school_weight"],
                state["crime_weight"],
                state["price_weight"],
            )

            explanation = generate_explanation(data)

            # LLM structured output ONLY (no hardcoding)
            state["response"] = "\n".join([
                explanation.get("tldr", ""),
                explanation.get("school_sentence", ""),
                explanation.get("safety_sentence", ""),
                explanation.get("affordability_sentence", ""),
                explanation.get("overall_sentence", ""),
                explanation.get("best_for", ""),
            ]).strip()

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
    }

    result = agent.invoke(state)
    return result["response"]