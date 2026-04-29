import json
import os
from typing import Any, Dict
from openai import OpenAI


# ---------------------------
# helper
# ---------------------------

def pct_diff_higher(a: float, b: float) -> float:
    high = max(a, b)
    low = min(a, b)
    if high == 0:
        return 0.0
    return ((high - low) / high) * 100


# ---------------------------
# build structured data
# ---------------------------

def build_explanation_data(
    city_a: str,
    city_b: str,
    result: Dict[str, Any],
    school_weight: float,
    crime_weight: float,
    price_weight: float,
):

    school_a, school_b = result["school_A"], result["school_B"]
    crime_a, crime_b = result["crime_A"], result["crime_B"]
    price_a, price_b = result["price_A"], result["price_B"]
    overall_a, overall_b = result["overall_A"], result["overall_B"]

    school_winner = city_a if school_a > school_b else city_b
    crime_winner = city_a if crime_a > crime_b else city_b
    price_winner = city_a if price_a > price_b else city_b
    overall_winner = city_a if overall_a > overall_b else city_b
    overall_loser = city_b if overall_winner == city_a else city_a

    return {
        "weights": {
            "school": school_weight,
            "crime": crime_weight,
            "price": price_weight,
        },
        "categories": {
            "school": {
                "winner": school_winner,
                "gap": pct_diff_higher(school_a, school_b),
            },
            "safety": {
                "winner": crime_winner,
                "gap": pct_diff_higher(crime_a, crime_b),
            },
            "affordability": {
                "winner": price_winner,
                "gap": pct_diff_higher(price_a, price_b),
            },
        },
        "overall": {
            "winner": overall_winner,
            "loser": overall_loser,
            "margin": pct_diff_higher(overall_a, overall_b),
        },
    }


# ---------------------------
# OpenAI explanation
# ---------------------------

def generate_explanation(data: Dict[str, Any]) -> Dict[str, str]:

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    prompt = f"""
Return ONLY valid JSON:

{{
  "tldr": "...",
  "school_sentence": "...",
  "safety_sentence": "...",
  "affordability_sentence": "...",
  "overall_sentence": "...",
  "best_for": "..."
}}

Use ONLY this data:
{json.dumps(data, indent=2)}
"""

    try:
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

        parsed = json.loads(text)

        return parsed

    except Exception as e:
        print("EXPLANATION ERROR:", e)

        return {
            "tldr": "Unable to generate explanation.",
            "school_sentence": "",
            "safety_sentence": "",
            "affordability_sentence": "",
            "overall_sentence": "",
            "best_for": "",
        }


# ---------------------------
# CHAT RESPONSE
# ---------------------------

def generate_chat_response(user_input: str) -> str:

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    prompt = f"""
You are a friendly real estate assistant.

User: {user_input}

Rules:
- 1–2 sentences max
- no JSON
- conversational tone
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

    return text.strip() or "Let me know if you'd like to compare cities!"