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


def _opportunity_cost_flags(
    overall_winner: str,
    school_winner: str,
    safety_winner: str,
    price_winner: str,
    school_pct: float,
    safety_pct: float,
    price_pct: float,
    overall_margin: float,
) -> Dict[str, Any]:
    loser_categories: list[str] = []
    if school_winner != overall_winner:
        loser_categories.append(f"schools (−{school_pct:.1f}%)")
    if safety_winner != overall_winner:
        loser_categories.append(f"safety (−{safety_pct:.1f}%)")
    if price_winner != overall_winner:
        loser_categories.append(f"affordability (−{price_pct:.1f}%)")

    win_categories: list[str] = []
    if school_winner == overall_winner:
        win_categories.append(f"schools (+{school_pct:.1f}%)")
    if safety_winner == overall_winner:
        win_categories.append(f"safety (+{safety_pct:.1f}%)")
    if price_winner == overall_winner:
        win_categories.append(f"affordability (+{price_pct:.1f}%)")

    if overall_margin < 2:
        decisiveness = "very close"
    elif overall_margin < 8:
        decisiveness = "moderate"
    else:
        decisiveness = "clear"

    return {
        "overall_margin_pct": round(overall_margin, 2),
        "decisiveness": decisiveness,
        "winner_stronger_in": win_categories,
        "winner_weaker_in": loser_categories,
        "winner_pays_premium": price_winner != overall_winner,
        "winner_less_safe": safety_winner != overall_winner,
        "winner_worse_schools": school_winner != overall_winner,
    }


def _best_for(
    city: str,
    is_school_winner: bool,
    is_safety_winner: bool,
    is_price_winner: bool,
) -> str:
    strengths = []
    if is_school_winner:
        strengths.append("schools")
    if is_safety_winner:
        strengths.append("safety")
    if is_price_winner:
        strengths.append("affordability")

    if not strengths:
        return f"{city.capitalize()} — competitive across the board"
    if len(strengths) == 1:
        return f"{city.capitalize()} — best for {strengths[0]}"
    return f"{city.capitalize()} — best for {' & '.join(strengths)}"


def _deciding_factor(
    weights: Dict[str, float],
    school_winner: str,
    safety_winner: str,
    price_winner: str,
    overall_winner: str,
    school_pct: float,
    safety_pct: float,
    price_pct: float,
) -> str:
    """
    Find the category that contributed most to the win
    (weight × gap), and return a plain-English sentence about it.
    """
    contributions = {
        "schools":       weights.get("school", 0) * school_pct if school_winner == overall_winner else 0,
        "safety":        weights.get("crime",  0) * safety_pct  if safety_winner == overall_winner else 0,
        "affordability": weights.get("price",  0) * price_pct   if price_winner  == overall_winner else 0,
    }
    if not any(contributions.values()):
        return ""

    top_factor = max(contributions, key=lambda k: contributions[k])
    weight_map = {"schools": "school", "safety": "crime", "affordability": "price"}
    w = weights.get(weight_map[top_factor], 0)
    pct_map = {"schools": school_pct, "safety": safety_pct, "affordability": price_pct}
    gap = pct_map[top_factor]

    return (
        f"The biggest driver was {top_factor}: weighted at {w:.0f}% of the score, "
        f"{overall_winner.capitalize()} led by {gap:.1f}% in that category."
    )


def build_explanation_data(
    city_a: str,
    city_b: str,
    result: Optional[Dict[str, Any]],
    school_weight: float,
    crime_weight: float,
    price_weight: float,
) -> Optional[Dict[str, Any]]:
    if result is None:
        return None

    school_a  = float(result["school_A"])
    school_b  = float(result["school_B"])
    safety_a  = float(result["crime_A"])
    safety_b  = float(result["crime_B"])
    price_a   = float(result["price_A"])
    price_b   = float(result["price_B"])
    overall_a = float(result["overall_A"])
    overall_b = float(result["overall_B"])

    school_winner  = city_a if school_a  > school_b  else city_b
    safety_winner  = city_a if safety_a  > safety_b  else city_b
    price_winner   = city_a if price_a   > price_b   else city_b
    overall_winner = city_a if overall_a > overall_b else city_b
    overall_loser  = city_b if overall_winner == city_a else city_a

    school_pct     = round(pct_diff_higher(school_a,  school_b),  2)
    safety_pct     = round(pct_diff_higher(safety_a,  safety_b),  2)
    price_pct      = round(pct_diff_higher(price_a,   price_b),   2)
    overall_margin = pct_diff_higher(overall_a, overall_b)

    weights = {"school": school_weight, "crime": crime_weight, "price": price_weight}

    opportunity_cost = _opportunity_cost_flags(
        overall_winner=overall_winner,
        school_winner=school_winner,
        safety_winner=safety_winner,
        price_winner=price_winner,
        school_pct=school_pct,
        safety_pct=safety_pct,
        price_pct=price_pct,
        overall_margin=overall_margin,
    )

    deciding_factor_sentence = _deciding_factor(
        weights=weights,
        school_winner=school_winner,
        safety_winner=safety_winner,
        price_winner=price_winner,
        overall_winner=overall_winner,
        school_pct=school_pct,
        safety_pct=safety_pct,
        price_pct=price_pct,
    )

    best_for_winner = _best_for(
        overall_winner,
        is_school_winner=(school_winner == overall_winner),
        is_safety_winner=(safety_winner == overall_winner),
        is_price_winner=(price_winner   == overall_winner),
    )
    best_for_loser = _best_for(
        overall_loser,
        is_school_winner=(school_winner == overall_loser),
        is_safety_winner=(safety_winner == overall_loser),
        is_price_winner=(price_winner   == overall_loser),
    )

    return {
        "weights": weights,
        "categories": {
            "school": {
                "winner": school_winner.capitalize(),
                "loser":  (city_b if school_winner == city_a else city_a).capitalize(),
                "percent_difference": school_pct,
            },
            "safety": {
                "winner": safety_winner.capitalize(),
                "loser":  (city_b if safety_winner == city_a else city_a).capitalize(),
                "percent_difference": safety_pct,
            },
            "affordability": {
                "winner": price_winner.capitalize(),
                "loser":  (city_b if price_winner == city_a else city_a).capitalize(),
                "percent_difference": price_pct,
            },
        },
        "overall": {
            "winner": overall_winner.capitalize(),
            "loser":  overall_loser.capitalize(),
            "winner_score": round(max(overall_a, overall_b), 3),
            "loser_score":  round(min(overall_a, overall_b), 3),
        },
        "opportunity_cost": opportunity_cost,
        "deciding_factor_sentence": deciding_factor_sentence,
        "best_for": {
            "winner": best_for_winner,
            "loser":  best_for_loser,
        },
    }


# ---------------------------------------------------------------------------
# Fallback (no API key)
# ---------------------------------------------------------------------------

def _fallback_explanation_sentences(data: Dict[str, Any]) -> Dict[str, str]:
    c      = data["categories"]
    o      = data["overall"]
    oc     = data["opportunity_cost"]
    winner = o["winner"]
    loser  = o["loser"]

    # TL;DR
    if oc["winner_pays_premium"] and not oc["winner_worse_schools"] and not oc["winner_less_safe"]:
        tldr = f"{winner} wins on quality of life; {loser} wins on price."
    elif not oc["winner_weaker_in"]:
        tldr = f"{winner} leads across every category."
    else:
        weak = ", ".join([x.split(" ")[0] for x in oc["winner_weaker_in"]])
        tldr = f"{winner} is the stronger overall pick, but {loser} has the edge on {weak}."

    school_sentence = (
        f"{c['school']['winner']}'s schools score {c['school']['percent_difference']}% "
        f"higher than {c['school']['loser']}'s "
        f"(schools weighted at {data['weights']['school']:.0f}%)."
    )

    safety_sentence = (
        f"{c['safety']['winner']} is {c['safety']['percent_difference']}% safer "
        f"than {c['safety']['loser']} "
        f"(safety weighted at {data['weights']['crime']:.0f}%)."
    )

    affordability_sentence = (
        f"{c['affordability']['winner']} is {c['affordability']['percent_difference']}% "
        f"more affordable than {c['affordability']['loser']} "
        f"(affordability weighted at {data['weights']['price']:.0f}%)."
    )

    decisiveness_phrase = {
        "very close": "narrowly edges out",
        "moderate":   "comes out ahead of",
        "clear":      "clearly outperforms",
    }[oc["decisiveness"]]

    if oc["winner_weaker_in"]:
        trade_off_str = " and ".join(oc["winner_weaker_in"])
        trade_off_clause = (
            f", even though it trails on {trade_off_str}. "
            f"If those factors matter most to you, {loser} is worth a closer look"
        )
    else:
        trade_off_clause = " across every category"

    df_line = data.get("deciding_factor_sentence", "")
    overall_sentence = (
        f"Overall, {winner} {decisiveness_phrase} {loser} "
        f"(margin: {oc['overall_margin_pct']}%){trade_off_clause}. "
        f"{df_line}"
    ).strip()

    best_for_str = f"{data['best_for']['winner']} | {data['best_for']['loser']}"

    return {
        "tldr": tldr,
        "school_sentence": school_sentence,
        "safety_sentence": safety_sentence,
        "affordability_sentence": affordability_sentence,
        "overall_sentence": overall_sentence,
        "best_for": best_for_str,
    }


# ---------------------------------------------------------------------------
# Gemini path
# ---------------------------------------------------------------------------

def generate_explanation_with_gemini(explanation_data: Optional[Dict[str, Any]]) -> Dict[str, str]:
    if explanation_data is None:
        return {
            "tldr": "",
            "school_sentence": "",
            "safety_sentence": "",
            "affordability_sentence": "",
            "overall_sentence": "Not enough data to explain this comparison.",
            "best_for": "",
        }

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        return _fallback_explanation_sentences(explanation_data)

    oc     = explanation_data["opportunity_cost"]
    winner = explanation_data["overall"]["winner"]
    loser  = explanation_data["overall"]["loser"]

    trade_off_hint = ""
    if oc["winner_weaker_in"]:
        trade_off_hint = (
            f"\nImportant: {winner} is weaker in {', '.join(oc['winner_weaker_in'])}. "
            f"Call this out in overall_sentence and tell the buyer who might still prefer {loser}."
        )

    schema = {
        "type": "object",
        "properties": {
            "tldr":                   {"type": "string"},
            "school_sentence":        {"type": "string"},
            "safety_sentence":        {"type": "string"},
            "affordability_sentence": {"type": "string"},
            "overall_sentence":       {"type": "string"},
            "best_for":               {"type": "string"},
        },
        "required": [
            "tldr", "school_sentence", "safety_sentence",
            "affordability_sentence", "overall_sentence", "best_for",
        ],
        "additionalProperties": False,
    }

    prompt = f"""
You are an explanation agent for a city recommendation system helping home-buyers
decide between two cities. Write in plain, direct language — no jargon, no filler.

Rules:
- Use only the numbers already in the structured data. Do not invent or recalculate.
- Every sentence should feel useful to a real buyer, not like a data readout.

Produce exactly these six fields:

1. tldr — One punchy sentence: bottom-line verdict + key trade-off.
   Example: "{winner} wins on quality of life; {loser} wins on price."

2. school_sentence — Better school city, margin, and mention the school weight
   ({explanation_data['weights']['school']}%) to show how much it mattered.

3. safety_sentence — Safer city, margin, and mention the safety weight
   ({explanation_data['weights']['crime']}%).

4. affordability_sentence — More affordable city, margin, and mention the price weight
   ({explanation_data['weights']['price']}%).

5. overall_sentence — Overall winner, {oc['decisiveness']} win
   ({oc['overall_margin_pct']}% margin). Name the single biggest deciding factor
   (use weights × gap). Then call out the opportunity cost honestly.{trade_off_hint}

6. best_for — Two short labels, one per city:
   "<WinnerCity> — best for <strengths> | <LoserCity> — best for <strengths>"

Structured data:
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


# ---------------------------------------------------------------------------
# CLI smoke-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    from comparison_usage import compare_districts_temp
    from realestate_data import load_district_dataframe

    district1 = "plano"
    district2 = "frisco"
    school_weight = 40
    crime_weight  = 35
    price_weight  = 25

    df_merged = load_district_dataframe()
    result = compare_districts_temp(
        district1, district2, df_merged,
        school_weight, crime_weight, price_weight,
    )

    if result is not None:
        explanation_data = build_explanation_data(
            district1, district2, result,
            school_weight, crime_weight, price_weight,
        )
        explanation_json = generate_explanation_with_gemini(explanation_data)

        print(f"\n📌 {explanation_json['tldr']}\n")
        print(f"🏫 {explanation_json['school_sentence']}")
        print(f"🛡️  {explanation_json['safety_sentence']}")
        print(f"💰 {explanation_json['affordability_sentence']}")
        print(f"\n⚖️  {explanation_json['overall_sentence']}")
        print(f"\n🏷️  {explanation_json['best_for']}")

        if explanation_data:
            oc = explanation_data["opportunity_cost"]
            print(
                f"\nScores: {explanation_data['overall']['winner']} = "
                f"{explanation_data['overall']['winner_score'] * 100:.1f}%  |  "
                f"{explanation_data['overall']['loser']} = "
                f"{explanation_data['overall']['loser_score'] * 100:.1f}%"
            )
    else:
        print("Comparison failed.")
