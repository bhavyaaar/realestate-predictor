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
df_capped.head(20)

# Data Cleaning and Preprocessing

# Converted the df_capped DataFrame from its current wide format to a long format to create a Date col and a House_Price col
df_house = pd.melt(df_capped, id_vars=non_date_cols, value_vars=date_cols, var_name='Date', value_name='House_Price')
df_house['Date'] = pd.to_datetime(df_house['Date'])
df_house.head(40)
# created 'Day', 'Year', and 'Month' cols from the 'Date' col
df_house['Year'] = df_house['Date'].dt.year
df_house['Month'] = df_house['Date'].dt.month
df_house['Day'] = df_house['Date'].dt.day
df_house.head()

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

print(df_model.head(40))

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

print("Best parameters:", grid_search.best_params_)

# Best model
best_model = grid_search.best_estimator_

# Prediction
y_pred = best_model.predict(X_test)

# Metrics
r2 = r2_score(y_test, y_pred)
mse = mean_squared_error(y_test, y_pred)
rmse = np.sqrt(mse)

print("R2:", r2)
print("MSE:", mse)
print("RMSE:", rmse)
rel_rmse = rmse / np.mean(y_test) * 100
print(f"Relative RMSE: {rel_rmse:.2f}%")


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
print(forecast_df.head(500))

# Chatbot
import pandas as pd
import re
from dateutil.parser import parse

def respond_to_price_question(user_question, forecast_df):
    """
    Respond to a user question about forecasted home prices.
    Can handle a city, and optionally a specific month/year.
    """
    # Step 1: Detect city
    cities = forecast_df['City'].unique()
    matched_city = None
    for city in cities:
        if re.search(r'\b' + re.escape(city) + r'\b', user_question, re.IGNORECASE):
            matched_city = city
            break

    if not matched_city:
        return "Sorry, I couldn't find that city in my data."

    # Step 2: Detect month/year (optional)
    # Try to parse any date in the user input
    matched_date = None
    try:
        parsed_date = parse(user_question, fuzzy=True, default=pd.Timestamp.today())
        matched_date = pd.Timestamp(year=parsed_date.year, month=parsed_date.month, day=1)
    except:
        matched_date = None  # no valid date found

    # Step 3: Filter forecast_df for the city
    city_forecast = forecast_df[forecast_df['City'] == matched_city].sort_values('Date')

    # Step 4: Respond
    if matched_date:
        # Find closest month in forecast
        specific_forecast = city_forecast[
            (city_forecast['Date'].dt.year == matched_date.year) &
            (city_forecast['Date'].dt.month == matched_date.month)
        ]
        if specific_forecast.empty:
            return f"Sorry, I don't have a prediction for {matched_city} in {matched_date.strftime('%b %Y')}."
        row = specific_forecast.iloc[0]
        price_str = f"${row['Predicted_Price']:,.0f}"
        return f"Predicted home price for {matched_city} in {matched_date.strftime('%b %Y')}: {price_str}"

    else:
        # if month is not specified: return full 6-month forecast
        response_lines = [f"Predicted home prices for {matched_city} for the next 6 months:"]
        for _, row in city_forecast.iterrows():
            month_str = row['Date'].strftime("%b %Y")
            price_str = f"${row['Predicted_Price']:,.0f}"
            response_lines.append(f"- {month_str}: {price_str}")
        return "\n".join(response_lines)



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
