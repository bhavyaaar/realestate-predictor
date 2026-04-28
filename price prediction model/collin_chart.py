"""
Render PNG chart: county-wide average historical vs forecasted home prices (Collin).
"""
from __future__ import annotations

import io

import matplotlib

matplotlib.use("Agg")
import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns


def render_collin_average_price_chart_png(
    df_house: pd.DataFrame,
    forecast_df: pd.DataFrame,
    *,
    figsize: tuple[float, float] = (14.0, 7.0),
    dpi: int = 110,
) -> bytes:
    """
    Historical = mean House_Price by Date across all Collin county rows.
    Forecast = mean Predicted_Price by Date across cities in forecast_df.
    """
    df_monthly_historical = df_house.groupby("Date", as_index=False)["House_Price"].mean()

    df_monthly_forecast = forecast_df.groupby("Date", as_index=False)["Predicted_Price"].mean()
    df_monthly_forecast = df_monthly_forecast.rename(columns={"Predicted_Price": "House_Price"})

    fig, ax = plt.subplots(figsize=figsize)

    sns.lineplot(
        data=df_monthly_historical,
        x="Date",
        y="House_Price",
        marker="o",
        label="Historical",
        ax=ax,
    )

    last_historical_point = df_monthly_historical.iloc[-1:].copy()
    df_for_forecast_plot = pd.concat([last_historical_point, df_monthly_forecast], ignore_index=True)

    sns.lineplot(
        data=df_for_forecast_plot,
        x="Date",
        y="House_Price",
        marker="x",
        linestyle="--",
        color="red",
        label="Forecasted",
        ax=ax,
    )

    ax.set_title("Historical and Forecasted Monthly Average House Prices in Collin County")
    ax.set_xlabel("Date")
    ax.set_ylabel("Average House Price")
    ax.grid(True)
    plt.setp(ax.get_xticklabels(), rotation=45)

    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m"))
    ax.xaxis.set_major_locator(mdates.MonthLocator(interval=3))

    min_date = df_monthly_historical["Date"].min()
    max_date = df_for_forecast_plot["Date"].max()
    ax.set_xlim(min_date, max_date)

    ax.legend(title="Data Type")
    plt.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=dpi, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf.getvalue()
