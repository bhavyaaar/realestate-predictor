import numpy as np
import pandas as pd
import os

# load data set
file_path = os.path.join("data", "zillow_city.csv")
df_zillow_city = pd.read_csv(file_path)

# keep only rows where RegionName contains "Collin County" and drop rest
df_home_data = df_zillow_city[df_zillow_city["CountyName"].str.contains("Collin County", case=False, na=False)]
# check to see if there are any null values
df_home_data.isnull().sum()
# get column names
all_cols = list(df_home_data.columns)
# Identify non-date columns
non_date_cols = ['RegionID', 'SizeRank', 'RegionName', 'RegionType', 'StateName', 'State', 'Metro']
# Filter date columns to cap the data from 2020-2026
date_cols = [col for col in all_cols if col not in non_date_cols and '2020' <= col[:4] <= '2026']
# Combine non-date columns and filtered columns
cols_keep = non_date_cols + date_cols
# New DataFrame with the capped data
df_capped = df_home_data[cols_keep]
#df_capped.head(20)

# Data Cleaning and Preprocessing

# Converted the df_capped DataFrame from its current wide format to a long format to create a Date col and a House_Price col
df_house = pd.melt(df_capped, id_vars=non_date_cols, value_vars=date_cols, var_name='Date', value_name='House_Price')
df_house['Date'] = pd.to_datetime(df_house['Date'])
#df_house.head(40)
# created 'Day', 'Year', and 'Month' cols from the 'Date' col
df_house['Year'] = df_house['Date'].dt.year
df_house['Month'] = df_house['Date'].dt.month
df_house['Day'] = df_house['Date'].dt.day
#df_house.head()

# Feature Engineering
# Sort the dataset by 'Date' so time order is correct
df_house = df_house.sort_values('Date').reset_index(drop=True)
# Previous month and previous year prices
df_house['prev_month_price'] = df_house['House_Price'].shift(1)
df_house['prev_year_price'] = df_house['House_Price'].shift(12)
# calculates the average of the 3 months for each position in the dataset
df_house['rolling_3m_avg'] = df_house['House_Price'].rolling(3).mean()
# Month and Day as integers
df_house['month'] = df_house['Month']       # 1–12
#df_house['day'] = df_house['Day']           # 1–31

# Derived features based on the dataset to increase model performance
# Quarter of the year
df_house['quarter'] = df_house['Month'].apply(lambda x: (x-1)//3 + 1)
# Month-over-month % change
df_house['mom_change'] = df_house['House_Price'].pct_change(1)
# Year-over-year % change
df_house['yoy_change'] = df_house['House_Price'].pct_change(12)

features = [
    'prev_month_price', 'prev_year_price', 'rolling_3m_avg',
    'month', 'quarter', 'mom_change', 'yoy_change'
]

df_model = df_house[['House_Price'] + features].copy()
df_model.dropna(inplace=True)  # drop NaNs caused by prev month/year

X = df_model.drop('House_Price', axis=1) # features
Y = df_model['House_Price'] # target variable

#print(df_model.head(40))

# Model Training and Evaluation
from xgboost import XGBRegressor
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit, train_test_split
from sklearn.metrics import mean_squared_error, r2_score

# Train/Test split
X_train, X_test, y_train, y_test = train_test_split(
    X, Y, test_size=0.2, shuffle=False
)

# Time series cross validation
tscv = TimeSeriesSplit(n_splits=3)

# Model
xgb_model = XGBRegressor(
    objective='reg:squarederror',
    eval_metric='rmse',
    random_state=42
)

# Hyperparameter grid
param_grid = {
    'n_estimators': [100, 200, 300], # Number of trees in the ensemble (more trees can improve accuracy but increase training time)
    'max_depth': [2, 3, 4],          # Maximum depth of each tree (controls complexity; higher values can overfit small datasets)
    'learning_rate': [0.01, 0.05, 0.1], # Step size shrinkage for each boosting step (smaller values = slower but potentially more accurate training)
    'subsample': [0.8, 1.0],   # Fraction of training samples used per tree (reduces overfitting if < 1.0)
    'colsample_bytree': [0.8, 1.0] # Fraction of features used per tree (helps regularize and prevent overfitting)
}

# GridSearch
grid_search = GridSearchCV(
    estimator=xgb_model,
    param_grid=param_grid,
    scoring='r2',
    cv=tscv,
    verbose=1, # progress
    n_jobs=-1 # uses all CPU cores to speed up training
)

grid_search.fit(X_train, y_train)

#print("Best parameters:", grid_search.best_params_)

# Best model
best_model = grid_search.best_estimator_

# Prediction
y_pred = best_model.predict(X_test)

# Metrics
r2 = r2_score(y_test, y_pred)
mse = mean_squared_error(y_test, y_pred)
rmse = np.sqrt(mse)

#print("R2:", r2)
#print("MSE:", mse)
#print("RMSE:", rmse)
rel_rmse = rmse / np.mean(y_test) * 100
#print(f"Relative RMSE: {rel_rmse:.2f}%")


# Predict House Prices Over Span of 6 Months
from dateutil.relativedelta import relativedelta
# List that will store all predicted values for every city
future_predictions = []
# Get a list of all unique cities in the dataset
cities = df_house['RegionName'].unique()
# Loop through each city to generate predictions separately
for city in cities:

    # Filter the dataset for the current city and sort by date
    city_df = df_house[df_house['RegionName'] == city].sort_values('Date').copy()
    history = city_df.copy()
    # Get the most recent date available in the dataset
    last_date = history['Date'].max()
    # Store the last 12 months of prices to create lag features
    price_history = list(history['House_Price'].tail(12))
    # Predict prices for the next 6 months
    for step in range(6):
        # Calculate the future prediction date
        next_date = last_date + relativedelta(months=step+1)
        month = next_date.month
        # day = next_date.day
        # Determine the quarter of the year (1–4)
        quarter = (month-1)//3 + 1
        prev_month_price = price_history[-1]
        # Lag feature: price from the same month last year
        # If less than 12 months exist, fall back to last price
        prev_year_price = price_history[-12] if len(price_history) >= 12 else price_history[-1]
        # Rolling average of the last 3 months of prices
        rolling_3m_avg = np.mean(price_history[-3:])
        # Month-over-month percentage price change
        mom_change = (
            (price_history[-1] - price_history[-2]) / price_history[-2]
            if len(price_history) >= 2 else 0
        )
        # Year-over-year percentage price change
        yoy_change = (
            (price_history[-1] - price_history[-12]) / price_history[-12]
            if len(price_history) >= 12 else 0
        )
        # dataframe with the features used when training the model
        X_future = pd.DataFrame({
            'prev_month_price':[prev_month_price],
            'prev_year_price':[prev_year_price],
            'rolling_3m_avg':[rolling_3m_avg],
            'month':[month],
            'quarter':[quarter],
            'mom_change':[mom_change],
            'yoy_change':[yoy_change]
        })
        # Use the trained XGBoost model to predict the next month's house price
        pred_price = best_model.predict(X_future)[0]
        # Save the prediction result
        future_predictions.append({
            'City': city,
            'Date': next_date,
            'Predicted_Price': pred_price
        })
        # Add the predicted price to price history
        # This allows the next prediction to use it as a lag feature
        price_history.append(pred_price)
# Convert the list of predictions into a DataFrame
forecast_df = pd.DataFrame(future_predictions)
# Display results
#print(forecast_df.head(500))

# Chatbot
import os
import pandas as pd
import re
from dateutil.parser import parse
from typing import Optional

def _gemini_fallback(user_question: str, cities_list, history: list = []) -> str:
    """Use Gemini to handle general / non-price questions with conversation history."""
    try:
        #api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return "I can only answer questions about home prices in Collin County cities. Try asking about a specific city!"

        from google import genai
        from google.genai import types
        client = genai.Client(api_key=api_key)
        model_name = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

        system_context = (
            "You are a friendly AI assistant for a Collin County, TX home price predictor app. "
            f"You have price forecast data for these cities: {', '.join(cities_list)}. "
            "Chat naturally with the user — respond warmly to greetings, small talk, and off-topic questions. "
            "But always find a smooth, natural way to bring the conversation back to real estate or home prices in Collin County. "
            "Never be robotic or blunt about redirecting — make it feel like a natural transition. "
            "Keep responses short and conversational."
        )

        # Build conversation history for Gemini (skip the initial welcome message)
        contents = []
        for msg in history[1:]:  # skip the assistant intro message
            role = "user" if msg.get("role") == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part(text=msg.get("content", ""))]))
        # Add current user message
        contents.append(types.Content(role="user", parts=[types.Part(text=user_question)]))

        response = client.models.generate_content(
            model=model_name,
            config=types.GenerateContentConfig(system_instruction=system_context),
            contents=contents,
        )
        return response.text.strip()
    except Exception as e:
        print(f"[Gemini error] {type(e).__name__}: {e}")
        return f"[DEBUG] Gemini error: {type(e).__name__}: {e}"


_MONTH_WORD_TO_NUM = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "sept": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}

_NEXT_N_WORD_TO_INT = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "eleven": 11,
    "twelve": 12,
}

_MONTH_NAME_REGEX = re.compile(
    r"\b(" + "|".join(sorted(_MONTH_WORD_TO_NUM.keys(), key=len, reverse=True)) + r")\b",
    flags=re.IGNORECASE,
)


def _parse_next_n_months_horizon(user_question: str) -> Optional[int]:
    """
    'next N month(s)' with a digit or word (one, two, …); also 'next month' (counts as 1).
    Returns None if not matched or the count word is unrecognized (e.g. 'next few months').
    """
    m = re.search(r"\bnext\s+(\d+|[a-z]+)\s+months?\b", user_question, flags=re.IGNORECASE)
    if m:
        raw = m.group(1).lower()
        if raw.isdigit():
            n = int(raw)
        else:
            n = _NEXT_N_WORD_TO_INT.get(raw)  # type: ignore[assignment]
        if n is not None and n >= 1:
            return min(n, 24)
    if re.search(r"\bnext\s+month\b", user_question, flags=re.IGNORECASE):
        return 1
    return None


def _wants_this_or_current_calendar_month(user_question: str) -> bool:
    return bool(
        re.search(
            r"\b(?:this|the\s+current|current)\s+month\b",
            user_question,
            flags=re.IGNORECASE,
        )
    )


def _month_names_in_order(user_question: str) -> list[int]:
    """Month numbers (1–12) in order of appearance."""
    nums: list[int] = []
    for m in _MONTH_NAME_REGEX.finditer(user_question):
        key = m.group(1).lower()
        if key == "may" and re.match(r"\s*i\b", user_question[m.end() :], re.IGNORECASE):
            continue  # skip "May I ..." auxiliary-verb phrase
        mn = _MONTH_WORD_TO_NUM.get(key)
        if mn is not None:
            nums.append(mn)
    return nums


def _forecast_rows_for_named_months(city_forecast: pd.DataFrame, month_nums: list[int]) -> pd.DataFrame:
    """One row per named month, using the first calendar year where all of them exist in the forecast."""
    cf = city_forecast.sort_values("Date")
    if not month_nums:
        return cf.iloc[:0]
    for y in sorted(cf["Date"].dt.year.unique()):
        rows: list[pd.Series] = []
        ok = True
        for mn in month_nums:
            hit = cf[(cf["Date"].dt.year == y) & (cf["Date"].dt.month == mn)]
            if hit.empty:
                ok = False
                break
            rows.append(hit.iloc[0])
        if ok:
            return pd.DataFrame(rows)
    return cf.iloc[:0]


def _forecast_rows_after_current_month(city_forecast: pd.DataFrame, n_months: int) -> pd.DataFrame:
    """
    Rows whose period is strictly after the current calendar month, then take the first n.
    """
    if city_forecast.empty or n_months <= 0:
        return city_forecast.iloc[:0]
    cur = pd.Timestamp.today().normalize().to_period("M")
    fut = city_forecast[city_forecast["Date"].dt.to_period("M") > cur].sort_values("Date")
    return fut.head(n_months)


def _format_price_bullet_lines(title: str, rows_df: pd.DataFrame) -> str:
    lines = [title]
    for _, row in rows_df.iterrows():
        month_str = row["Date"].strftime("%b %Y")
        price_str = f"${row['Predicted_Price']:,.0f}"
        lines.append(f"- {month_str}: {price_str}")
    return "\n".join(lines)


def _cities_mentioned_ordered(user_question: str, cities) -> list:
    """
    Collect every forecast city whose name appears as a whole word in the question,
    ordered by first occurrence in the text (e.g. 'Allen and Wylie' → Allen, then Wylie).
    """
    hits = []
    for city in cities:
        m = re.search(r'\b' + re.escape(str(city)) + r'\b', user_question, re.IGNORECASE)
        if m:
            hits.append((m.start(), city))
    hits.sort(key=lambda x: x[0])
    return [c for _, c in hits]


def respond_to_price_question(user_question, forecast_df, history: list = []):
    """
    Respond to a user question about forecasted home prices.
    Routes general/conversational questions to Gemini LLM with full conversation history.
    Can handle one or more cities, and optionally a specific month/year.
    """
    cities = forecast_df['City'].unique()

    # Step 1: Detect all cities mentioned (order preserved by appearance in message)
    matched_cities = _cities_mentioned_ordered(user_question, cities)

    if not matched_cities:
        # Fall back to Gemini with full conversation history
        return _gemini_fallback(user_question, list(cities), history)

    horizon_n = _parse_next_n_months_horizon(user_question)
    wants_calendar_now = _wants_this_or_current_calendar_month(user_question)
    month_names_ordered = _month_names_in_order(user_question)

    # Fuzzy parse for a calendar month/year — skip when it would fight clearer intents,
    # or when multiple month names appear (avoid spurious single-month picks from words like 'prices').
    matched_date = None
    skip_fuzzy = (
        horizon_n is not None
        or wants_calendar_now
        or len(month_names_ordered) >= 2
    )
    if not skip_fuzzy:
        try:
            parsed_date = parse(user_question, fuzzy=True, default=pd.Timestamp.today())
            matched_date = pd.Timestamp(year=parsed_date.year, month=parsed_date.month, day=1)
        except Exception:
            matched_date = None

    def _forecast_for_city(matched_city: str) -> str:
        city_forecast = forecast_df[forecast_df["City"] == matched_city].sort_values("Date")

        # 1) Rolling window: next N months after today (not including the current calendar month)
        if horizon_n is not None:
            short = _forecast_rows_after_current_month(city_forecast, horizon_n)
            if short.empty:
                return (
                    f"Sorry, I don't have enough future months in the forecast for {matched_city} "
                    "after the current month."
                )
            if horizon_n == 1:
                title = f"Predicted home prices for {matched_city} for the next month:"
            else:
                title = f"Predicted home prices for {matched_city} for the next {horizon_n} months:"
            return _format_price_bullet_lines(title, short)

        # 2) This / current calendar month
        if wants_calendar_now:
            cur = pd.Timestamp.today().normalize().to_period("M")
            tm = city_forecast[city_forecast["Date"].dt.to_period("M") == cur]
            if tm.empty:
                return (
                    f"Sorry, I don't have a prediction for {matched_city} for "
                    f"{pd.Timestamp.today():%b %Y}."
                )
            row = tm.iloc[0]
            price_str = f"${row['Predicted_Price']:,.0f}"
            return (
                f"Predicted home price for {matched_city} in {row['Date'].strftime('%b %Y')}: "
                f"{price_str}"
            )

        # 3) Several named months (e.g. February, March, and April)
        if len(month_names_ordered) >= 2:
            named_df = _forecast_rows_for_named_months(city_forecast, month_names_ordered)
            if named_df.empty:
                pretty = ", ".join(
                    pd.Timestamp(2020, m, 1).strftime("%B") for m in month_names_ordered
                )
                return f"Sorry, I don't have predictions for {matched_city} covering {pretty}."
            title = f"Predicted home prices for {matched_city}:"
            return _format_price_bullet_lines(title, named_df)

        # 4) Exactly one named month — prefer spelled month over a mismatched fuzzy date
        if len(month_names_ordered) == 1:
            mnum = month_names_ordered[0]
            if matched_date is not None and matched_date.month == mnum:
                specific_forecast = city_forecast[
                    (city_forecast["Date"].dt.year == matched_date.year)
                    & (city_forecast["Date"].dt.month == mnum)
                ]
            else:
                hit = city_forecast[city_forecast["Date"].dt.month == mnum].sort_values("Date")
                specific_forecast = hit.iloc[:1]
            if specific_forecast.empty:
                return (
                    f"Sorry, I don't have a prediction for {matched_city} in "
                    f"{pd.Timestamp(2020, mnum, 1).strftime('%B')}."
                )
            row = specific_forecast.iloc[0]
            price_str = f"${row['Predicted_Price']:,.0f}"
            return (
                f"Predicted home price for {matched_city} in {row['Date'].strftime('%b %Y')}: "
                f"{price_str}"
            )

        # 5) Fuzzy single month/year (no spelled month extracted)
        if matched_date:
            specific_forecast = city_forecast[
                (city_forecast["Date"].dt.year == matched_date.year)
                & (city_forecast["Date"].dt.month == matched_date.month)
            ]
            if specific_forecast.empty:
                return (
                    f"Sorry, I don't have a prediction for {matched_city} in "
                    f"{matched_date.strftime('%b %Y')}."
                )
            row = specific_forecast.iloc[0]
            price_str = f"${row['Predicted_Price']:,.0f}"
            return (
                f"Predicted home price for {matched_city} in {matched_date.strftime('%b %Y')}: "
                f"{price_str}"
            )

        # 6) Default: full horizon in dataset (6 months ahead)
        response_lines = [f"Predicted home prices for {matched_city} for the next 6 months:"]
        for _, row in city_forecast.iterrows():
            month_str = row["Date"].strftime("%b %Y")
            price_str = f"${row['Predicted_Price']:,.0f}"
            response_lines.append(f"- {month_str}: {price_str}")
        return "\n".join(response_lines)

    if len(matched_cities) == 1:
        return _forecast_for_city(matched_cities[0])

    # Multiple cities: section per city (same wording as single-city replies)
    parts = []
    for i, mc in enumerate(matched_cities):
        block = _forecast_for_city(mc)
        if i > 0:
            parts.append("")
        parts.append(block)
    return "\n".join(parts)



# print("🏠 Welcome to the Real Estate Price Chatbot!")
# print("Type your question about a city (and optionally a month/year), or 'exit' to quit.")

# while True:
#     user_input = input("\nYou: ")
#     if user_input.lower() in ['exit', 'quit']:
#         print("bot: Goodbye! 👋")
#         break

#     response = respond_to_price_question(user_input, forecast_df)
#     print(f"\nbot:\n{response}")


# Backend integration function (was added for server.py compatibility)
def get_forecast_df() -> pd.DataFrame:
    """
    Returns the forecast_df that was already trained and generated above.
    This function is called by server.py on startup.
    """
    return forecast_df


def get_df_house() -> pd.DataFrame:
    """Long-format Collin County Zillow history used for training and charts."""
    return df_house
