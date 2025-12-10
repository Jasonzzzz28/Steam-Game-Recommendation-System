# Steam Game Recommendation System

A scalable, production-style **hybrid recommendation system** for Steam games.  
Built with **PySpark**, **item-based KNN collaborative filtering**, **content-based filtering**, and an **AWS S3 data lake**.

---

## Overview

This project processes the full Kaggle *Game Recommendations on Steam* dataset and produces a high-quality recommendation engine using three stages:

### 1. Distributed ETL with PySpark
- Processed over **41M Steam reviews**
- Built clean fact/dimension tables:
  - `reviews_clean` (user–game interactions)
  - `games_clean` (game metadata, tags, description)
  - `users_clean`
- Wrote curated data as **Parquet + Snappy** for efficient downstream processing
- Stored results in an **AWS S3 data lake** (raw → curated → temp)

#### 1.1 S3 Data Lake
All raw and curated data is stored in the team S3 bucket:

- **Bucket:** `s3://steam-reco-team-yw1204/`

Directory layout used in this project:
- **Raw (immutable Kaggle archive):** `s3://steam-reco-team-yw1204/raw/steam_kaggle/dt=1205/`
- **Curated (ETL outputs):** `s3://steam-reco-team-yw1204/curated/`
- **Temp (optional scratch):** `s3://steam-reco-team-yw1204/tmp/`
- **Athena query results (optional):** `s3://steam-reco-team-yw1204/athena_query_results/`

#### 1.2 Raw Inputs
Raw files ingested from Kaggle and stored under:

```
s3://steam-reco-team-yw1204/raw/steam_kaggle/dt=1205/
```

Raw files and schemas:
- `recommendations.csv`: `app_id, helpful, funny, date, is_recommended, hours, user_id, review_id`
- `games.csv`: `app_id, title, date_release, win, mac, linux, rating, positive_ratio, user_reviews, price_final, price_original, discount, steam_deck`
- `users.csv`: `user_id, products, reviews`
- `games_metadata.json`: JSON Lines containing (at minimum) `app_id, description, tags`

#### 1.3 Curated Outputs
All curated outputs are stored as **Parquet + Snappy** in versioned folders for reproducibility:

- **reviews_clean (fact table)**  
  Location: `s3://steam-reco-team-yw1204/curated/reviews_clean/v=1/`  
  Partition: `review_year=YYYY/`  
  Key fields: `user_id, app_id, is_recommended, playtime_hours, helpful_votes, funny_votes, review_date, review_month`

- **games_clean (dimension table)**  
  Location: `s3://steam-reco-team-yw1204/curated/games_clean/v=1/`  
  Partition: `release_year=YYYY/`  
  Key fields: `app_id, title, description, tags, rating, positive_ratio, user_reviews, price_final, price_original, discount, win/mac/linux, steam_deck`

- **users_clean (dimension table)**  
  Location: `s3://steam-reco-team-yw1204/curated/users_clean/v=1/`  
  Key fields: `user_id, products_owned, reviews_count`

#### 1.4 ETL Cleaning Rules
ETL was implemented in **PySpark (Google Colab, EMR-compatible)** with the following rules:
- **Schema enforcement** for all CSV sources; JSON normalized to `app_id, description, tags`
- **Type normalization**
  - `date` / `date_release` parsed into proper dates and year/month derived
  - pricing fields (`price_final`, `price_original`, `discount`) standardized to numeric types
  - `is_recommended` normalized to `0/1`
- **Filtering**
  - dropped rows with missing `user_id` or `app_id`
  - invalid dates dropped (unusable for partitioning/time-based analysis)
  - negative playtime hours treated as invalid and set to null
- **Deduplication**
  - interaction key: `(user_id, app_id, review_date)`
  - kept latest record by `review_id`
- **Enrichment**
  - joined `games.csv` with `games_metadata.json` on `app_id` to attach `description` and `tags`

#### 1.5 QA Metrics
Post-ETL validation (after cleaning + deduplication):
- `reviews_clean` rows: **41,154,794**
- `games_clean` rows: **50,872**
- `users_clean` rows: **14,306,064**
- distinct users in reviews: **13,781,059**
- distinct apps in reviews: **37,610**

#### 1.6 Querying Curated Data with Amazon Athena (External Table DDL)
Athena provides a serverless SQL interface over the curated Parquet tables on S3.

**Step 0 (one-time):** In the Athena console, set the *Query result location* to:

```
s3://steam-reco-team-yw1204/athena_query_results/
```

**Step 1:** Create a database (run in Athena Query Editor):

```sql
CREATE DATABASE IF NOT EXISTS steam_rec;
```

**Step 2:** Create external tables (run in Athena Query Editor).

**(a) reviews_clean**

```sql
CREATE EXTERNAL TABLE IF NOT EXISTS steam_rec.reviews_clean (
  app_id         INT,
  user_id        STRING,
  review_id      STRING,
  helpful_votes  INT,
  funny_votes    INT,
  playtime_hours DOUBLE,
  review_date    DATE,
  review_month   INT,
  is_recommended INT
)
PARTITIONED BY (review_year INT)
STORED AS PARQUET
LOCATION 's3://steam-reco-team-yw1204/curated/reviews_clean/v=1/';
```

Load partitions:

```sql
MSCK REPAIR TABLE steam_rec.reviews_clean;
```

**(b) games_clean**

```sql
CREATE EXTERNAL TABLE IF NOT EXISTS steam_rec.games_clean (
  app_id          INT,
  title           STRING,
  release_date    DATE,
  win             BOOLEAN,
  mac             BOOLEAN,
  linux           BOOLEAN,
  rating          STRING,
  positive_ratio  INT,
  user_reviews    INT,
  price_final     DOUBLE,
  price_original  DOUBLE,
  discount        DOUBLE,
  steam_deck      BOOLEAN,
  description     STRING,
  tags            ARRAY<STRING>
)
PARTITIONED BY (release_year INT)
STORED AS PARQUET
LOCATION 's3://steam-reco-team-yw1204/curated/games_clean/v=1/';
```

Load partitions:

```sql
MSCK REPAIR TABLE steam_rec.games_clean;
```

**(c) users_clean**

```sql
CREATE EXTERNAL TABLE IF NOT EXISTS steam_rec.users_clean (
  user_id        STRING,
  products_owned INT,
  reviews_count  INT
)
STORED AS PARQUET
LOCATION 's3://steam-reco-team-yw1204/curated/users_clean/v=1/';
```

**Quick sanity query:**

```sql
SELECT COUNT(*) FROM steam_rec.reviews_clean;
SELECT COUNT(*) FROM steam_rec.games_clean;
SELECT COUNT(*) FROM steam_rec.users_clean;
```

---

### 2. Feature Engineering
This module implements a full-scale feature engineering pipeline on AWS EMR using PySpark, transforming raw behavioral data into model-ready analytical tables. The pipeline consumes curated review, user, and game datasets stored in Amazon S3 (/curated/...) and produces three feature outputs:
- User-level aggregated features
- Game-level aggregated features
- A unified interaction-level model feature table

All outputs are saved back to S3 with versioned paths for reproducibility. (root:"s3a://steam-reco-team-yw1204/feature/model_feature_table_sx2492/v=2")

#### 2.1 Data Loading & Setup
- Loaded curated tables from S3: reviews, users, games.
- Registered all as temporary SQL views for Spark SQL + PySpark workflows.

#### 2.2 Large-Scale EDA

Performed high-level distribution analysis:
- User activity patterns
- Game popularity trends
- Recommendation ratios
- Playtime, helpful/funny metrics
All aggregations executed in Spark to avoid OOM.

#### 2.3 User-Level Features

Built a comprehensive user profile table including:
- Total reviews
- Recommendation ratio
- Total & average playtime
- Unique games
- Helpful/funny metrics

Derived metrics:
- engagement_score = log1p(total_reviews) * recommend_ratio
- activity_level = low / medium / high

#### 2.4 Game-Level Features

Aggregated gameplay & metadata attributes:
- num_reviews, recommend_ratio
- avg_hours, avg_helpful, avg_funny
- unique_users
- price, rating, positive_ratio
- platform support, Steam Deck flag
- release_year, is_free

Derived:
- popularity_score = num_reviews * recommend_ratio

#### 2.5 Model Interaction Table 
Joined:recommendations × user_features × game_features、
Produced a unified training table including:
- Binary label (1 = recommended)
- User behavioral features
- Game metadata features
- Review-level attributes (hours, helpful, funny, date)


### 3. Two Independent Recommendation Models
#### Content-Based Filtering (CBF)
Uses game metadata:
- TF-IDF on descriptions
- Vectorized tags
- Combined into high-dimensional game vectors

#### Collaborative Filtering (CF)
Uses item-based KNN (sparse matrix model):
- Converts user–item interactions into a large sparse matrix
- Computes item–item similarity
- Returns recommended games even for sparse users

### 4. Hybrid Recommender + Re-Ranking
Final recommendation score combines both systems:

```
hybrid_score = α * cf_norm + β * cb_norm
```

The system:
- Removes games the user already played
- Re-ranks by hybrid score
- Outputs top-N personalized recommendations with metadata and tags

---

## Architecture

```
Steam Recommender System
│
├── AWS S3 Data Lake
│     ├── raw/      (original Kaggle files)
│     ├── curated/  (clean parquet tables)
│     └── feature/  (feature tables)
│     └── tmp/      (ETL scratch space)
│
├── PySpark ETL + Feature Engineering (EMR)
│     ├── schema enforcement
│     ├── cleansing + normalization
│     ├── user/game feature generation
│     ├── TF–IDF + tags preprocessing
│     └── partitioned parquet output
│
├── Recommendation Engine
│     ├── Content-Based Model (Spark ML)
│     ├── Collaborative Filtering (KNN)
│     └── Hybrid Ranking System
│
└── Notebooks & Scripts
      ├── etl_spark.ipynb
      ├── recommender_hybrid.ipynb
      └── evaluation utilities
```

---

## Data Sources

Dataset:  
**Kaggle – Game Recommendations on Steam**  
Contains ~41 million reviews, 50k games, 14M users, and detailed metadata.

Curated tables include:

### `reviews_clean`
- user_id  
- app_id  
- is_recommended  
- playtime_hours  
- helpful_votes  
- funny_votes  
- review_date / year / month  

### `games_clean`
- app_id  
- title  
- tags  
- description  
- positive_ratio  
- pricing info  
- platforms (win/mac/linux)  
- release_year  

### `users_clean`
- user_id  
- products_owned  
- reviews_count  

---

## Features

### ETL
- Strong schema validation
- Deduplication of user–app–date triples
- Description cleaning (lowercase, punctuation removal)
- Parsing multi-platform flags
- Yearly partitioning for performance

### Content-Based Filtering
- TF-IDF representation of game descriptions
- CountVectorizer for tags
- VectorAssembler to build a final content vector per game
- Computes cosine similarity with user profile vectors

### Collaborative Filtering
- User–item matrix with custom scoring:
  - Recommendation flag
  - Log-scaled playtime
- Item-based KNN similarity
- Fast inference even with millions of interactions

### Hybrid Model
- CF candidate generation
- CB re-scoring on CF candidates
- Weighted hybrid score
- Exclusion of already-played games
- Final ranked list of recommended titles with tags

---

## Running the System

The project supports:

### Google Colab
- All ETL and recommendation notebooks run end-to-end in Colab
- Spark configured with S3A credentials
- Local FAISS / KNN CF runs at scale with sampling

### AWS S3
- Stores raw and curated layers
- ETL writes Parquet partitions directly into S3

### AWS EMR
- PySpark ETL is EMR-compatible
- Can scale to hundreds of millions of interactions

---

## Example Output

```
User’s Played Games:
- Counter-Strike: Global Offensive
  tags: ['FPS', 'Shooter', 'Competitive']

Top Recommendations:
1. Apex Legends
   tags: ['FPS', 'Battle Royale', 'Action']
2. Destiny 2
   tags: ['MMO', 'FPS', 'Co-op']
3. PUBG: Battlegrounds
   tags: ['Survival', 'Shooter', 'Battle Royale']
```

---

## Future Work

Planned improvements:

- Popularity-based smoothing
- Diversity boosting in the hybrid re-ranking
- Real-time API using FastAPI or AWS Lambda
- Model evaluation: Recall@K, MAP@K, NDCG
- Multi-modal embeddings (images, tags, descriptions)
- Deployment to SageMaker Endpoints

---

## Tech Stack

- PySpark  
- AWS S3  
- Spark ML  
- Scikit-learn  
- Sparse matrix models  
- Pandas / NumPy  
- Optional: FAISS for fast similarity search

---

## License

MIT License.
