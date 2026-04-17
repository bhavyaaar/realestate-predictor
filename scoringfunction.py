import pandas as pd


def add_composite_scores(df_merged: pd.DataFrame) -> pd.DataFrame:
    """Add school, crime, and price composite scores (0–1 scale)."""
    df = df_merged.copy()

    df["school_composite"] = (
        df["school_score_norm"] * 0.35
        + df["grad_rate_norm"] * 0.20
        + df["ccr_norm"] * 0.25
        + df["avg_sat_norm"] * 0.10
        + df["avg_act_norm"] * 0.10
    )

    df["crime_composite"] = (
        df["family_violence_norm"] * 0.35
        + df["sexual_assault_norm"] * 0.30
        + df["robbery_norm"] * 0.25
        + df["larcency_norm"] * 0.07
        + df["arson_norm"] * 0.03
    )

    df["price_composite"] = df["price_norm"]
    return df
