from typing import List, Optional
from pydantic import BaseModel, Field

class TrendPoint(BaseModel):
  label: str
  value: float

class StatsResponse(BaseModel):
  reviews: int
  games: int
  users: int
  avg_price: float
  positive_ratio: float = Field(..., ge=0, le=1)
  trends: List[TrendPoint]

class PipelineItem(BaseModel):
  stage: str
  owner: str
  status: str
  updatedAt: Optional[str] = None
  details: Optional[str] = None
  outputPath: Optional[str] = None

class RecommendationItem(BaseModel):
  appId: str
  title: str
  score: float
  reason: Optional[str] = None
  tags: Optional[List[str]] = None
  price: Optional[float] = None
  platforms: Optional[List[str]] = None
  language: Optional[str] = None

class RecommendationQuery(BaseModel):
  userId: str = Field(..., alias="userId")
  language: Optional[str] = None
  priceCap: Optional[float] = None
  platform: Optional[str] = None
  limit: int = Field(default=20, ge=1, le=50)
