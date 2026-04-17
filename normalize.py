# Clean ALL columns: remove %, commas, convert to float
for col in df_merged.columns:
    if col != "district":
        df_merged[col] = (
            df_merged[col]
            .astype(str)
            .str.replace(",", "", regex=False)
            .str.replace("%", "", regex=False)
            .str.strip()
        )
        df_merged[col] = pd.to_numeric(df_merged[col], errors="coerce")
    else:
        df_merged[col] = df_merged[col].astype(str).str.strip().str.lower()

# Drop empty unnamed columns
df_merged = df_merged.loc[:, ~df_merged.columns.str.startswith("Unnamed")]

# Convert percentage columns to decimal
pct_cols = ["grad_rate_4yr", "dropout_rate_gr_7_8", "dropout_rate_gr_9_12", "ccr_rate"]
for col in pct_cols:
    df_merged[col] = df_merged[col] / 100

# Helper
def percentile_norm(series):
    series = pd.to_numeric(series, errors="coerce")
    n = series.count()
    return series.rank(pct=True) * (n / (n + 1))

# Per-capita crime (per 1,000 residents)
df_merged["family_violence_pc"] = (df_merged["family_violence_2024"] / df_merged["population"]) * 1000
df_merged["sexual_assault_pc"]  = (df_merged["sexual_assualt_2024"]  / df_merged["population"]) * 1000
df_merged["robbery_pc"]         = (df_merged["robbery_2024"]          / df_merged["population"]) * 1000
df_merged["larcency_pc"]         = (df_merged["larcency_2024"]         / df_merged["population"]) * 1000
df_merged["arson_pc"]           = (df_merged["arson_2024"]            / df_merged["population"]) * 1000

# Normalize school columns: higher = better
df_merged["school_score_norm"] = percentile_norm(df_merged["school_score_raw"])
df_merged["grad_rate_norm"]    = percentile_norm(df_merged["grad_rate_4yr"])
df_merged["ccr_norm"]          = percentile_norm(df_merged["ccr_rate"])
df_merged["avg_sat_norm"]      = percentile_norm(df_merged["avg_sat_score_2024"])
df_merged["avg_act_norm"]      = percentile_norm(df_merged["avg_act_score_2024"])

df_merged["dropout_7_8_norm"]   = 1 - percentile_norm(df_merged["dropout_rate_gr_7_8"])
df_merged["dropout_9_12_norm"]  = 1 - percentile_norm(df_merged["dropout_rate_gr_9_12"])

# Normalize crime columns: lower = better (invert)
df_merged["family_violence_norm"] = 1 - percentile_norm(df_merged["family_violence_pc"])
df_merged["sexual_assault_norm"]  = 1 - percentile_norm(df_merged["sexual_assault_pc"])
df_merged["robbery_norm"]         = 1 - percentile_norm(df_merged["robbery_pc"])
df_merged["larcency_norm"]         = 1 - percentile_norm(df_merged["larcency_pc"])
df_merged["arson_norm"]           = 1 - percentile_norm(df_merged["arson_pc"])

#-Normalize price: lower = better (invert)
df_merged["price_norm"] = 1 - percentile_norm(df_merged["mean_prices"])

# Save normalized columns only
output_cols = [
    "school_score_norm", "grad_rate_norm", "ccr_norm",
    "avg_sat_norm", "avg_act_norm", "dropout_7_8_norm", "dropout_9_12_norm",
    "family_violence_norm", "sexual_assault_norm", "robbery_norm",
    "larcency_norm", "arson_norm", "price_norm"
]

df_output = df_merged.set_index("district")
print(df_output[output_cols].round(3))
df_output[output_cols].round(3).to_csv("/content/drive/MyDrive/Capstone Project/normalized_output.csv")