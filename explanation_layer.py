# pct_diff_higher
def pct_diff_higher(score1, score2):
    higher = max(score1, score2)
    lower = min(score1, score2)

    if higher == 0:
        return 0.0

    return ((higher - lower) / higher) * 100

# build explanation data
def build_explanation_data(city_a, city_b, result, school_weight, crime_weight, price_weight):
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
                "percent_difference": round(pct_diff_higher(school_a, school_b), 2)
            },
            "safety": {
                "winner": safety_winner.capitalize(),
                "loser": city_b.capitalize() if safety_winner == city_a else city_a.capitalize(),
                "percent_difference": round(pct_diff_higher(safety_a, safety_b), 2)
            },
            "affordability": {
                "winner": price_winner.capitalize(),
                "loser": city_b.capitalize() if price_winner == city_a else city_a.capitalize(),
                "percent_difference": round(pct_diff_higher(price_a, price_b), 2)
            }
        },
        "overall": {
            "winner": overall_winner.capitalize(),
            "loser": city_b.capitalize() if overall_winner == city_a else city_a.capitalize(),
            "winner_score": round(max(overall_a, overall_b), 3),
            "loser_score": round(min(overall_a, overall_b), 3)
        }
    }

# create the GenAI explanation function
def generate_explanation_with_gemini(explanation_data):
    schema = {
        "type": "object",
        "properties": {
            "school_sentence": {"type": "string"},
            "safety_sentence": {"type": "string"},
            "affordability_sentence": {"type": "string"},
            "overall_sentence": {"type": "string"}
        },
        "required": [
            "school_sentence",
            "safety_sentence",
            "affordability_sentence",
            "overall_sentence"
        ],
        "additionalProperties": False
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

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_json_schema": schema,
        },
    )

    return json.loads(response.text)

# call GenAI function
result = compare_districts_temp(
    district1,
    district2,
    df_merged,
    school_weight,
    crime_weight,
    price_weight
)

if result is not None:
    explanation_data = build_explanation_data(
        district1,
        district2,
        result,
        school_weight,
        crime_weight,
        price_weight
    )

    explanation_json = generate_explanation_with_gemini(explanation_data)

    print("Output:\n")
    print(f"- {explanation_json['school_sentence']}")
    print(f"- {explanation_json['safety_sentence']}")
    print(f"- {explanation_json['affordability_sentence']}")
    print(f"\n{explanation_json['overall_sentence']}")
    print(
        f"\nOverall scores: "
        f"{explanation_data['overall']['winner']} = {explanation_data['overall']['winner_score']*100:.1f}%, "
        f"{explanation_data['overall']['loser']} = {explanation_data['overall']['loser_score']*100:.1f}%"
    )
else:
    print("Comparison failed.")