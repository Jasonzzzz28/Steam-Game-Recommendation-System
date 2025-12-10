from typing import List
from app.schemas import RecommendationItem, RecommendationQuery
from app.services import data_access

class RecommendationService:
  def __init__(self):
    self.games_meta = data_access.load_games_metadata()

  def recommend(self, query: RecommendationQuery) -> List[RecommendationItem]:
    raw = data_access.load_precomputed_recs(query.userId)
    items: List[RecommendationItem] = []

    for rec in raw:
      if query.language and rec.get("language") and rec.get("language") != query.language:
        continue
      if query.platform and rec.get("platforms") and query.platform not in rec.get("platforms", []):
        continue
      if query.priceCap is not None and rec.get("price") is not None and rec["price"] > query.priceCap:
        continue
      items.append(RecommendationItem(**rec))
      if len(items) >= query.limit:
        break

    if not items and raw:
      # return top N even if filters remove everything
      items = [RecommendationItem(**rec) for rec in raw[: query.limit]]

    return items

service = RecommendationService()
