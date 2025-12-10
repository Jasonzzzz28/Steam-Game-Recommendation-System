from typing import List
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from app import config
from app.schemas import StatsResponse, PipelineItem, RecommendationItem, RecommendationQuery
from app.services import data_access
from app.services import recommender

app = FastAPI(title="Steam Recommendation API", version="0.1.0")

# Allow local dev + simple demos
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"]
)

@app.get("/health")
async def health():
  return {"status": "ok"}


@app.get("/stats", response_model=StatsResponse)
async def get_stats():
  data = data_access.load_stats()
  return data


@app.get("/pipeline", response_model=List[PipelineItem])
async def get_pipeline():
  return data_access.load_pipeline()


@app.get("/recommendations", response_model=List[RecommendationItem])
async def get_recommendations(
  userId: str = Query(..., description="Steam user id"),
  language: str | None = Query(None),
  priceCap: float | None = Query(None, ge=0),
  platform: str | None = Query(None),
  limit: int = Query(config.DEFAULT_LIMIT, ge=1, le=config.MAX_LIMIT),
):
  query = RecommendationQuery(
    userId=userId,
    language=language,
    priceCap=priceCap,
    platform=platform,
    limit=limit,
  )
  return recommender.service.recommend(query)


# Root redirect
@app.get("/")
async def root():
  return {"message": "Steam Recommendation API", "docs": "/docs"}
