"""
Offline training script adapted from Steam_Recommendation_System_Final.ipynb.
- Reads curated Parquet from S3: reviews_clean, games_clean, users_clean
- Builds content vectors from game descriptions + tags
- Samples ratings and trains item-based collaborative filtering (cosine KNN)
- Blends CF + content scores and exports top-N recommendations per user
- (optional) upload the JSON to S3 for the FastAPI service to consume
Run this in Colab/EMR (not inside the FastAPI server). Upload the output JSON/Parquet to S3 and let the API serve it.
"""

import json
import os
from pathlib import Path

import numpy as np
import pandas as pd
import boto3
from pyspark.sql import SparkSession, functions as F
from pyspark.ml import Pipeline
from pyspark.ml.feature import RegexTokenizer, HashingTF, IDF, CountVectorizer, VectorAssembler
from sklearn.neighbors import NearestNeighbors

BUCKET = "steam-reco-team-yw1204"
CURATED = f"s3a://{BUCKET}/curated"

# __file__ is not defined in notebooks; fall back to current working directory
try:
  BASE_PATH = Path(__file__).resolve().parent.parent
except NameError:
  BASE_PATH = Path.cwd()
RECS_OUT = BASE_PATH / "data" / "recommendations.json"

# Tunables (override with environment variables in Colab/EMR)
SAMPLE_FRACTION = float(os.getenv("SAMPLE_FRACTION", "0.05"))
MAX_RATINGS = int(os.getenv("MAX_RATINGS", "2000000"))
NUM_USERS = int(os.getenv("NUM_USERS", "100"))  # how many users to export
TOP_N = int(os.getenv("TOP_N", "30"))
S3_UPLOAD = os.getenv("S3_UPLOAD", "0") == "1"
S3_UPLOAD_PATH = os.getenv("S3_UPLOAD_PATH", f"s3://{BUCKET}/api/recommendations/recommendations.json")


def build_spark(app_name: str = "SteamReco-Colab") -> SparkSession:
  return (
    SparkSession.builder
    .appName(app_name)
    .config("spark.jars.packages", "org.apache.hadoop:hadoop-aws:3.3.4,com.amazonaws:aws-java-sdk-bundle:1.12.262")
    .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem")
    .config("spark.hadoop.fs.s3a.path.style.access", "true")
    .config("spark.hadoop.fs.s3a.aws.credentials.provider", "com.amazonaws.auth.EnvironmentVariableCredentialsProvider")
    .getOrCreate()
  )


def load_curated(spark: SparkSession):
  reviews = spark.read.parquet(f"{CURATED}/reviews_clean/v=1")
  games = spark.read.parquet(f"{CURATED}/games_clean/v=1")
  users = spark.read.parquet(f"{CURATED}/users_clean/v=1")
  return reviews, games, users


def build_content_vectors(games_df):
  """
  Build content vectors from description (+ tags if available).
  Falls back to description-only if no tags column exists.
  """
  has_tags = "tags" in games_df.columns
  games_clean = games_df.withColumn("description_clean", F.lower(F.col("description"))).na.fill({"description_clean": ""})

  tokenizer = RegexTokenizer(inputCol="description_clean", outputCol="desc_words", pattern="\\W+")
  hashTF = HashingTF(inputCol="desc_words", outputCol="desc_tf", numFeatures=4096)
  idf = IDF(inputCol="desc_tf", outputCol="desc_tfidf")

  stages = [tokenizer, hashTF, idf]
  input_cols = ["desc_tfidf"]

  if has_tags:
    tag_cv = CountVectorizer(inputCol="tags", outputCol="tags_vec", vocabSize=2048, minDF=2.0)
    stages.append(tag_cv)
    input_cols.append("tags_vec")

  assembler = VectorAssembler(inputCols=input_cols, outputCol="content_vec")
  stages.append(assembler)

  pipeline = Pipeline(stages=stages)
  model = pipeline.fit(games_clean)
  games_vec = model.transform(games_clean)

  select_cols = ["app_id", "title", "content_vec"]
  if has_tags:
    select_cols.append("tags")
  return games_vec.select(*select_cols)


def sample_ratings(reviews_df, fraction: float = 0.05, limit: int = 2_000_000) -> pd.DataFrame:
  """
  Clean and sample ratings. Cast playtime to double safely to avoid NumberFormatException
  if any value contains non-numeric tokens (e.g., '60s').
  """
  playtime_col = "playtime_hours" if "playtime_hours" in reviews_df.columns else "hours"
  ratings = reviews_df.select("user_id", "app_id", "is_recommended", playtime_col)

  # Extract first numeric token to avoid strings like "60s" causing NumberFormatException
  ratings = ratings.withColumn(
    "playtime_num",
    F.regexp_extract(F.col(playtime_col).cast("string"), "([0-9]+(?:\\.[0-9]+)?)", 1).cast("double")
  ).fillna({"playtime_num": 0.0})

  ratings = ratings.withColumn(
    "score",
    1.0 * F.col("is_recommended").cast("float") + 0.5 * F.log1p(F.col("playtime_num"))
  )
  pdf = ratings.select("user_id", "app_id", "score").sample(withReplacement=False, fraction=fraction, seed=42).limit(limit).toPandas()
  return pdf


def train_item_knn(ratings_pd: pd.DataFrame):
  ratings_pd["user_idx"] = ratings_pd["user_id"].astype("category").cat.codes
  ratings_pd["item_idx"] = ratings_pd["app_id"].astype("category").cat.codes

  user_cats = ratings_pd["user_id"].astype("category").cat.categories
  item_cats = ratings_pd["app_id"].astype("category").cat.categories

  from scipy.sparse import coo_matrix
  sparse_matrix = coo_matrix(
    (ratings_pd["score"], (ratings_pd["user_idx"], ratings_pd["item_idx"])),
    shape=(len(user_cats), len(item_cats))
  ).tocsr()

  item_user_matrix = sparse_matrix.T.tocsr()
  model_knn_items = NearestNeighbors(metric="cosine", algorithm="brute", n_neighbors=50, n_jobs=-1)
  model_knn_items.fit(item_user_matrix)

  return {
    "model": model_knn_items,
    "sparse_matrix": sparse_matrix,
    "user_cats": user_cats,
    "item_cats": item_cats,
  }


def recommend_for_user(user_id: str, artifacts, games_vec_df, top_n: int = 20, alpha_cf: float = 0.6, alpha_cb: float = 0.4):
  """
  Per-user hybrid recommendation (CF + CB) similar to the notebook:
  - item-based CF neighbors as candidates
  - content similarity from the user's played-game profile
  - filter out already played items
  """
  model = artifacts["model"]
  sparse_matrix = artifacts["sparse_matrix"]
  user_cats = artifacts["user_cats"]
  item_cats = artifacts["item_cats"]

  try:
    user_idx = user_cats.get_loc(user_id)
  except KeyError:
    return []

  row = sparse_matrix.getrow(user_idx)
  item_idxs = row.indices
  if len(item_idxs) == 0:
    return []

  user_played_apps = {item_cats[i] for i in item_idxs}
  anchor_idx = item_idxs[0]

  # CF neighbors of anchor
  dists, neigh_idxs = model.kneighbors([sparse_matrix[:, anchor_idx].toarray().ravel()], n_neighbors=top_n + 50)
  cf_candidates = [(item_cats[idx], 1 - dist) for dist, idx in zip(dists[0], neigh_idxs[0]) if idx != anchor_idx]
  cf_df = pd.DataFrame(cf_candidates, columns=["app_id", "cf_score"])
  cf_df = cf_df[~cf_df["app_id"].isin(user_played_apps)]
  if cf_df.empty:
    return []
  cf_df["cf_norm"] = (cf_df["cf_score"] - cf_df["cf_score"].min()) / (cf_df["cf_score"].max() - cf_df["cf_score"].min() + 1e-9)

  candidate_app_ids = cf_df["app_id"].tolist()

  # User content profile = average of played game vectors
  played_vecs = games_vec_df.filter(F.col("app_id").isin(list(user_played_apps))).select("content_vec").collect()
  if not played_vecs:
    return []
  import numpy as np  # local to avoid unused warning
  user_profile = np.mean(np.vstack([row["content_vec"].toArray() for row in played_vecs]), axis=0)

  # Content similarity on candidates only
  candidates_df = games_vec_df.filter(F.col("app_id").isin(candidate_app_ids)).select("app_id", "content_vec", "title")
  if "tags" in candidates_df.columns:
    candidates_df = candidates_df.select("app_id", "content_vec", "title", "tags")
  rows = candidates_df.collect()

  cb_rows = []
  for row_c in rows:
    sim = float(np.dot(user_profile, row_c["content_vec"].toArray()) / (np.linalg.norm(user_profile) * np.linalg.norm(row_c["content_vec"].toArray()) + 1e-9))
    cb_rows.append((row_c["app_id"], sim))
  cb_df = pd.DataFrame(cb_rows, columns=["app_id", "cb_score"])
  cb_df["cb_norm"] = (cb_df["cb_score"] - cb_df["cb_score"].min()) / (cb_df["cb_score"].max() - cb_df["cb_score"].min() + 1e-9)

  # Hybrid merge
  hybrid = pd.merge(cf_df[["app_id", "cf_norm"]], cb_df[["app_id", "cb_norm"]], on="app_id", how="outer").fillna(0)
  hybrid["hybrid_score"] = alpha_cf * hybrid["cf_norm"] + alpha_cb * hybrid["cb_norm"]
  hybrid = hybrid.sort_values("hybrid_score", ascending=False).head(top_n)

  # Attach metadata from collected rows
  meta = {row["app_id"]: {"title": row["title"], "tags": row["tags"] if "tags" in row else None} for row in rows}

  recs = []
  for _, rec in hybrid.iterrows():
    app_id = rec["app_id"]
    info = meta.get(app_id, {})
    recs.append({
      "appId": str(app_id),
      "title": info.get("title", ""),
      "tags": info.get("tags"),
      "score": float(rec["hybrid_score"])
    })
  return recs


def export_recs(user_ids, artifacts, games_vec_df, out_file: Path):
  out = {}
  for uid in user_ids:
    out[uid] = recommend_for_user(uid, artifacts, games_vec_df)
  out_file.parent.mkdir(parents=True, exist_ok=True)
  with out_file.open("w", encoding="utf-8") as f:
    json.dump(out, f)


def upload_to_s3(local_path: Path, s3_uri: str):
  if not s3_uri.startswith("s3://"):
    raise ValueError("S3_UPLOAD_PATH must start with s3://")
  _, _, rest = s3_uri.partition("s3://")
  bucket, _, key = rest.partition("/")
  s3 = boto3.client("s3")
  s3.upload_file(str(local_path), bucket, key)
  print(f"Uploaded {local_path} -> s3://{bucket}/{key}")


def main():
  spark = build_spark()
  reviews, games, users = load_curated(spark)
  games_vec_df = build_content_vectors(games)
  ratings_pd = sample_ratings(reviews, fraction=SAMPLE_FRACTION, limit=MAX_RATINGS)
  artifacts = train_item_knn(ratings_pd)

  # Export a set of users (sample)
  user_ids = ratings_pd["user_id"].drop_duplicates().sample(NUM_USERS, random_state=42).tolist()
  export_recs(user_ids, artifacts, games_vec_df, RECS_OUT)
  print(f"Wrote recommendations for {len(user_ids)} users to {RECS_OUT}")

  if S3_UPLOAD:
    upload_to_s3(RECS_OUT, S3_UPLOAD_PATH)


if __name__ == "__main__":
  main()
