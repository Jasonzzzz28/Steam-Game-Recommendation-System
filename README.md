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

### 2. Two Independent Recommendation Models
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

### 3. Hybrid Recommender + Re-Ranking
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
│     └── tmp/      (ETL scratch space)
│
├── PySpark ETL
│     ├── schema enforcement
│     ├── cleansing + normalization
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

### AWS EMR (Optional)
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
