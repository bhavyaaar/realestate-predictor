def compare_districts(district_A, district_B, dataframe, school_weight, crime_weight, price_weight):
    data_A = dataframe[dataframe["district"] == district_A]
    data_B = dataframe[dataframe["district"] == district_B]

    if data_A.empty or data_B.empty:
        return None

    row_A = data_A.iloc[0]
    row_B = data_B.iloc[0]

    school_weight /= 100
    crime_weight /= 100
    price_weight /= 100

    overall_A = (
        row_A["school_composite"] * school_weight
        + row_A["crime_composite"] * crime_weight
        + row_A["price_composite"] * price_weight
    )
    overall_B = (
        row_B["school_composite"] * school_weight
        + row_B["crime_composite"] * crime_weight
        + row_B["price_composite"] * price_weight
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
        "delta_overall": overall_B - overall_A,
    }
