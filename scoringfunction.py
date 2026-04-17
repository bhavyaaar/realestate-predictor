#creating composite scores for each section
df_merged["school_composite"] = (
    df_merged["school_score_norm"] * 0.35 + # these weights can change but it's based on how important each factor may be for families
    df_merged["grad_rate_norm"]    * 0.20 +
    df_merged["ccr_norm"]          * 0.25 +
    df_merged["avg_sat_norm"]      * 0.10 +
    df_merged["avg_act_norm"]      * 0.10
)

df_merged["crime_composite"] = (
    df_merged["family_violence_norm"] * 0.35 +
    df_merged["sexual_assault_norm"]  * 0.30 +
    df_merged["robbery_norm"]         * 0.25 +
    df_merged["larcency_norm"]         * 0.07 +
    df_merged["arson_norm"]           * 0.03
)

df_merged["price_composite"] = df_merged["price_norm"]
