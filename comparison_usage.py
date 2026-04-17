district1 = "plano"
district2 = "frisco"

# should add up to 100
school_weight = 40
crime_weight = 35
price_weight = 25

# calc the percent diff between 2 cities
def pct_diff(a, b):
    if a == 0:
        return 0
    return ((b - a) / a) * 100

def compare_districts_temp(district_A, district_B, dataframe, school_weight, crime_weight, price_weight):
    data_A = dataframe[dataframe['district'] == district_A]
    data_B = dataframe[dataframe['district'] == district_B]

    if data_A.empty or data_B.empty:
        return None

    row_A = data_A.iloc[0]
    row_B = data_B.iloc[0]

    # Normalize weights to a 0-1 scale for calculation
    school_weight_norm = school_weight / 100
    crime_weight_norm  = crime_weight  / 100
    price_weight_norm  = price_weight  / 100

    overall_A = (
        row_A["school_composite"] * school_weight_norm +
        row_A["crime_composite"] * crime_weight_norm +
        row_A["price_composite"] * price_weight_norm
    )
    overall_B = (
        row_B["school_composite"] * school_weight_norm +
        row_B["crime_composite"] * crime_weight_norm +
        row_B["price_composite"] * price_weight_norm
    )

    return {
        "school_A": row_A["school_composite"],
        "school_B": row_B["school_composite"],
        "crime_A": row_A["crime_composite"],
        "crime_B": row_B["crime_composite"],
        "price_A": row_A["price_composite"],
        "price_B": row_B["price_composite"],
        "delta_school": row_B["school_composite"] - row_A["school_composite"],
        "delta_crime": row_B["crime_composite"] - row_A["crime_composite"],
        "delta_price": row_B["price_composite"] - row_A["price_composite"],
        "overall_A": overall_A,
        "overall_B": overall_B,
        "delta_overall": overall_B - overall_A
    }


result = compare_districts_temp(
    district1,
    district2,
    df_merged,
    school_weight,
    crime_weight,
    price_weight
)

if result and "error" not in result:
    print(f"\n Comparison: {district1.capitalize()} vs {district2.capitalize()}")
    print("-" * 50)

    print(f"\n Weights Used: School={school_weight}%, Crime={crime_weight}%, Price={price_weight}%")

    print("\n Category Scores (0–1 scale) (Raw):")
    print(f"School   → {district1}: {result['school_A']:.3f} | {district2}: {result['school_B']:.3f}")
    print(f"Safety   → {district1}: {result['crime_A']:.3f} | {district2}: {result['crime_B']:.3f}")
    print(f"Price    → {district1}: {result['price_A']:.3f} | {district2}: {result['price_B']:.3f}")

    print("\n Overall Score (based on weights):")
    print(f"{district1}: {result['overall_A']:.3f}")
    print(f"{district2}: {result['overall_B']:.3f}")

    print("\n Differences (B - A):")
    print(f"School \u0394 : {result['delta_school']:.3f}")
    print(f"Safety \u0394 : {result['delta_crime']:.3f}")
    print(f"Price \u0394  : {result['delta_price']:.3f}")
    print(f"Overall \u0394: {result['delta_overall']:.3f}")

    print("\n % Differences (relative to A):")
    print(f"School   : {pct_diff(result['school_A'], result['school_B']):.2f}%")
    print(f"Safety   : {pct_diff(result['crime_A'], result['crime_B']):.2f}%")
    print(f"Price    : {pct_diff(result['price_A'], result['price_B']):.2f}%")
    print(f"Overall  : {pct_diff(result['overall_A'], result['overall_B']):.2f}%")

    # Winner logic
    if result["overall_B"] > result["overall_A"]:
        print(f"\n Winner: {district2.capitalize()}")
    elif result["overall_B"] < result["overall_A"]:
        print(f"\n Winner: {district1.capitalize()}")
    else:
        print("\n It's a tie!")

else:
    print("Comparison failed:", result)
