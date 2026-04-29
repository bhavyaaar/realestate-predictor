"""
FastAPI backend server for the Real Estate Analysis Tool.

Endpoints:
  POST /api/opportunity  — Opportunity cost / district comparison agent
  POST /api/price        — Price prediction chatbot
  GET  /api/health       — Health check
"""
from dotenv import load_dotenv
load_dotenv()
import os
import sys
import re
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Optional
import asyncio
import base64



# Make the backend modules importable
_root = Path(__file__).parent
sys.path.insert(0, str(_root / "agentic chatbot"))
sys.path.insert(0, str(_root / "price prediction model"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from graphs import plot_city_graph # type: ignore
from agentic_layer import run_opportunity_agent  # type: ignore
from collin_chart import render_collin_average_price_chart_png  # type: ignore
from model import get_df_house, get_forecast_df, respond_to_price_question  # type: ignore

# ── State ──────────────────────────────────────────────────────────────────────
_forecast_df = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _forecast_df
    print("[server] Training price prediction model — this may take ~30 s…")
    loop = asyncio.get_event_loop()
    _forecast_df = await loop.run_in_executor(None, get_forecast_df)
    print("[server] Price prediction model ready.")
    yield


# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ────────────────────────────────────────────────────────────────────
class OpportunityRequest(BaseModel):
    message: str
    school_weight: float = 40.0
    crime_weight: float = 35.0
    price_weight: float = 25.0
    district_a: Optional[str] = None
    district_b: Optional[str] = None


class PriceRequest(BaseModel):
    message: str


# ── Helpers ────────────────────────────────────────────────────────────────────
def _normalize_district(name: Optional[str]) -> Optional[str]:
    """Strip ' ISD' suffix and lowercase so names match the CSV district column."""
    if not name:
        return None
    return re.sub(r"\s*isd\s*$", "", name.strip(), flags=re.IGNORECASE).strip().lower()


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok", "price_model_ready": _forecast_df is not None}


@app.post("/api/opportunity")
def opportunity(req: OpportunityRequest):
    district_a = _normalize_district(req.district_a)
    district_b = _normalize_district(req.district_b)

    response = run_opportunity_agent(
        req.message,
        req.school_weight,
        req.crime_weight,
        req.price_weight,
        district_a,
        district_b,
    )
    return {"response": response}


@app.post("/api/price")
def price(req: PriceRequest):
    if _forecast_df is None:
        return {"response": "Model loading..."}

    message = req.message.lower()

    # GRAPH MODE
    if "graph" in message:

        city = None

        for c in _forecast_df["City"].unique():
            if re.search(rf"\b{re.escape(c.lower())}\b", message):
                city = c
                break

        if not city:
            return {"response": "Please specify a city (e.g., Plano, Frisco, McKinney)."}

        try:
            print(f"[graph] generating graph for {city}")

            img_bytes = plot_city_graph(city)

            if not img_bytes:
                return {"response": "No graph available for that city."}

            return Response(content=img_bytes, media_type="image/png")

        except Exception as e:
            print("GRAPH ERROR:", e)
            return {"response": "Graph generation failed. Check backend logs."}

    # TEXT MODE
    response = respond_to_price_question(req.message, _forecast_df)
    return {"response": response}

@app.get("/api/collin-average-chart")
def collin_average_chart():
    """PNG: county-level mean historical vs mean forecasted prices over time."""
    if _forecast_df is None:
        return Response(status_code=503)
    png = render_collin_average_price_chart_png(get_df_house(), _forecast_df)
    return Response(content=png, media_type="image/png")


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)
