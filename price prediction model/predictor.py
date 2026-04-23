"""
Price prediction module — imported by server.py.

Exports:
  get_forecast_df()               -> pd.DataFrame  (runs at server startup)
  respond_to_price_question(...)  -> str
"""

import re
import numpy as np
import pandas as pd
from pathlib import Path
from dateutil.relativedelta import relativedelta
from dateutil.parser import parse


# ── Model training & forecasting ───────────────────────────────────────────────

def get_forecast_df() -> pd.DataFrame:
    """
    Train the XGBoost price model on Collin County Zillow data and return
    a 6-month city-level forecast DataFrame with columns [City, Date, Predicted_Price].
    Uses fixed hyperparameters (no GridSearchCV) for fast startup.
    """
    from xgboost import XGBRegressor
    from sklearn.model_selection import train_test_split

    # Locate data relative to this file's directory
    data_path = Path(__file__).parent.parent / "data" / "zillow_city.csv"
    df_zillow = pd.read_csv(data_path)

    # Keep only Collin County rows
    df_home = df_zillow[
        df_zillow["CountyName"].str.contains("Collin County", case=False, na=False)
    ]

    # Identify date columns capped to 2020–2026
    all_cols = list(df_home.columns)
    non_date_cols = ["RegionID", "SizeRank", "RegionName", "RegionType", "StateName", "State", "Metro"]
    date_cols = [
        col for col in all_cols
        if col not in non_date_cols and "2020" <= col[:4] <= "2026"
    ]
    df_capped = df_home[non_date_cols + date_cols]

    # Wide → long
    df_house = pd.melt(
        df_capped,
        id_vars=non_date_cols,
        value_vars=date_cols,
        var_name="Date",
        value_name="House_Price",
    )
    df_house["Date"] = pd.to_datetime(df_house["Date"])
    df_house["Year"] = df_house["Date"].dt.year
    df_house["Month"] = df_house["Date"].dt.month
    df_house["Day"] = df_house["Date"].dt.day

    # Feature engineering
    df_house = df_house.sort_values("Date").reset_index(drop=True)
    df_house["prev_month_price"] = df_house["House_Price"].shift(1)
    df_house["prev_year_price"] = df_house["House_Price"].shift(12)
    df_house["rolling_3m_avg"] = df_house["House_Price"].rolling(3).mean()
    df_house["month"] = df_house["Month"]
    df_house["quarter"] = df_house["Month"].apply(lambda x: (x - 1) // 3 + 1)
    df_house["mom_change"] = df_house["House_Price"].pct_change(1)
    df_house["yoy_change"] = df_house["House_Price"].pct_change(12)

    features = [
        "prev_month_price", "prev_year_price", "rolling_3m_avg",
        "month", "quarter", "mom_change", "yoy_change",
    ]
    df_model = df_house[["House_Price"] + features].dropna().copy()

    X = df_model.drop("House_Price", axis=1)
    Y = df_model["House_Price"]
    X_train, _, y_train, _ = train_test_split(X, Y, test_size=0.2, shuffle=False)

    # Fixed hyperparameters — avoids expensive GridSearchCV at startup
    model = XGBRegressor(
        objective="reg:squarederror",
        n_estimators=200,
        max_depth=3,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
    )
    model.fit(X_train, y_train)

    # 6-month city-level forecast
    future_predictions = []
    for city in df_house["RegionName"].unique():
        city_df = df_house[df_house["RegionName"] == city].sort_values("Date")
        last_date = city_df["Date"].max()
        price_history = list(city_df["House_Price"].tail(12))

        for step in range(6):
            next_date = last_date + relativedelta(months=step + 1)
            month = next_date.month
            quarter = (month - 1) // 3 + 1
            prev_month = price_history[-1]
            prev_year = price_history[-12] if len(price_history) >= 12 else price_history[-1]
            rolling_avg = float(np.mean(price_history[-3:]))
            mom = (price_history[-1] - price_history[-2]) / price_history[-2] if len(price_history) >= 2 else 0.0
            yoy = (price_history[-1] - price_history[-12]) / price_history[-12] if len(price_history) >= 12 else 0.0

            X_future = pd.DataFrame({
                "prev_month_price": [prev_month],
                "prev_year_price": [prev_year],
                "rolling_3m_avg": [rolling_avg],
                "month": [month],
                "quarter": [quarter],
                "mom_change": [mom],
                "yoy_change": [yoy],
            })
            pred = float(model.predict(X_future)[0])
            future_predictions.append({"City": city, "Date": next_date, "Predicted_Price": pred})
            price_history.append(pred)

    return pd.DataFrame(future_predictions)


# ── Chatbot response ───────────────────────────────────────────────────────────

def respond_to_price_question(user_question: str, forecast_df: pd.DataFrame) -> str:
    """Return a natural-language price forecast answer for the user's question."""
    cities = forecast_df["City"].unique()

    # Match a city name mentioned in the question
    matched_city = None
    for city in cities:
        if re.search(r"\b" + re.escape(city) + r"\b", user_question, re.IGNORECASE):
            matched_city = city
            break

    if not matched_city:
        available = ", ".join(sorted(cities))
        return (
            f"Sorry, I couldn't find that city in my data. "
            f"Available cities: {available}."
        )

    # Try to parse an optional month/year from the question
    matched_date = None
    try:
        parsed = parse(user_question, fuzzy=True, default=pd.Timestamp.today())
        matched_date = pd.Timestamp(year=parsed.year, month=parsed.month, day=1)
    except Exception:
        matched_date = None

    city_forecast = forecast_df[forecast_df["City"] == matched_city].sort_values("Date")

    if matched_date:
        specific = city_forecast[
            (city_forecast["Date"].dt.year == matched_date.year)
            & (city_forecast["Date"].dt.month == matched_date.month)
        ]
        if specific.empty:
            return (
                f"Sorry, I don't have a prediction for {matched_city} "
                f"in {matched_date.strftime('%b %Y')}."
            )
        row = specific.iloc[0]
        return (
            f"Predicted home price for {matched_city} "
            f"in {matched_date.strftime('%b %Y')}: ${row['Predicted_Price']:,.0f}"
        )

    # Full 6-month forecast
    lines = [f"Predicted home prices for {matched_city} over the next 6 months:"]
    for _, row in city_forecast.iterrows():
        lines.append(f"  • {row['Date'].strftime('%b %Y')}: ${row['Predicted_Price']:,.0f}")
    return "\n".join(lines)
