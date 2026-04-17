import json
import os
from typing import Any, Dict, Optional

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass


def pct_diff_higher(score1: float, score2: float) -> float:
    higher = max(score1, score2)
    lower = min(score1, score2)

    if higher == 0:
        return 0.0

    return ((higher - lower) / higher) * 100


def build_explanation_data(
    city_a: str,
    city_b: str,
    result: Optional[Dict[str, Any]],
    school_weight: float,
    crime_weight: float,
    price_weight: float,
) -> Optional[Dict[str, Any]]:
    del school_weight, crime_weight, price_weight
    if result is None:
        return None

    school_a = float(result["school_A"])
    school_b = float(result["school_B"])
    safety_a = float(result["crime_A"])
    safety_b = float(result["crime_B"])
    price_a = float(result["price_A"])
    price_b = float(result["price_B"])
    overall_a = float(result["overall_A"])
    overall_b = float(result["overall_B"])

    school_winner = city_a if school_a > school_b else city_b
    safety_winner = city_a if safety_a > safety_b else city_b
    price_winner = city_a if price_a > price_b else city_b
    overall_winner = city_a if overall_a > overall_b else city_b

    return {
        "categories": {
            "school": {
                "winner": school_winner.capitalize(),
                "loser": city_b.capitalize() if school_winner == city_a else city_a.capitalize(),
                "percent_difference": round(pct_diff_higher(school_a, school_b), 2),
            },
            "safety": {
                "winner": safety_winner.capitalize(),
                "loser": city_b.capitalize() if safety_winner == city_a else city_a.capitalize(),
                "percent_difference": round(pct_diff_higher(safety_a, safety_b), 2),
            },
            "affordability": {
                "winner": price_winner.capitalize(),
                "loser": city_b.capitalize() if price_winner == city_a else city_a.capitalize(),
                "percent_difference": round(pct_diff_higher(price_a, price_b), 2),
            },
        },
        "overall": {
            "winner": overall_winner.capitalize(),
            "loser": city_b.capitalize() if overall_winner == city_a else city_a.capitalize(),
            "winner_score": round(max(overall_a, overall_b), 3),
            "loser_score": round(min(overall_a, overall_b), 3),
        },
    }


def _fallback_explanation_sentences(data: Dict[str, Any]) -> Dict[str, str]:
    c = data["categories"]
    o = data["overall"]
    return {
        "school_sentence": (
            f"{c['school']['winner']}'s school district is better than "
            f"{c['school']['loser']}'s school district by "
            f"{c['school']['percent_difference']}%."
        ),
        "safety_sentence": (
            f"{c['safety']['winner']} is a safer city than "
            f"{c['safety']['loser']} by {c['safety']['percent_difference']}%."
        ),
        "affordability_sentence": (
            f"{c['affordability']['winner']} is more affordable than "
            f"{c['affordability']['loser']} by "
            f"{c['affordability']['percent_difference']}%."
        ),
        "overall_sentence": f"Overall, {o['winner']} is a better option.",
    }


def generate_explanation_with_gemini(explanation_data: Optional[Dict[str, Any]]) -> Dict[str, str]:
    if explanation_data is None:
        return {
            "school_sentence": "",
            "safety_sentence": "",
            "affordability_sentence": "",
            "overall_sentence": "Not enough data to explain this comparison.",
        }

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        return _fallback_explanation_sentences(explanation_data)

    schema = {
        "type": "object",
        "properties": {
            "school_sentence": {"type": "string"},
            "safety_sentence": {"type": "string"},
            "affordability_sentence": {"type": "string"},
            "overall_sentence": {"type": "string"},
        },
        "required": [
            "school_sentence",
            "safety_sentence",
            "affordability_sentence",
            "overall_sentence",
        ],
        "additionalProperties": False,
    }

    prompt = f"""
You are an explanation agent for a city recommendation system.

Use only the structured data provided.
Do not calculate new numbers.
Do not invent facts.

Use this exact style:
1. <winner>'s school district is better than <loser>'s school district by <percent>%.
2. <winner> is a safer city than <loser> by <percent>%.
3. <winner> is more affordable than <loser> by <percent>%.
4. Overall, <winner> is a better option.

Here is the structured data:
{json.dumps(explanation_data, indent=2)}
"""

    try:
        from google import genai

        client = genai.Client(api_key=api_key)
        model = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_json_schema": schema,
            },
        )
        text = getattr(response, "text", None) or ""
        return json.loads(text)
    except Exception:
        return _fallback_explanation_sentences(explanation_data)


if __name__ == "__main__":
    from comparison_usage import compare_districts_temp
    from realestate_data import load_district_dataframe

    district1 = "plano"
    district2 = "frisco"
    school_weight = 40
    crime_weight = 35
    price_weight = 25

    df_merged = load_district_dataframe()
    result = compare_districts_temp(
        district1,
        district2,
        df_merged,
        school_weight,
        crime_weight,
        price_weight,
    )

    if result is not None:
        explanation_data = build_explanation_data(
            district1,
            district2,
            result,
            school_weight,
            crime_weight,
            price_weight,
        )

        explanation_json = generate_explanation_with_gemini(explanation_data)

        print("Output:\n")
        print(f"- {explanation_json['school_sentence']}")
        print(f"- {explanation_json['safety_sentence']}")
        print(f"- {explanation_json['affordability_sentence']}")
        print(f"\n{explanation_json['overall_sentence']}")
        if explanation_data:
            print(
                f"\nOverall scores: "
                f"{explanation_data['overall']['winner']} = "
                f"{explanation_data['overall']['winner_score'] * 100:.1f}%, "
                f"{explanation_data['overall']['loser']} = "
                f"{explanation_data['overall']['loser_score'] * 100:.1f}%"
            )
    else:
        print("Comparison failed.")
