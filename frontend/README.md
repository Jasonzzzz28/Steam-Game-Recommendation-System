# Steam Game Recommendation Frontend

A Vite + React scaffold to surface Person1/2/3 outputs: data quality, Hive/Athena paths, and a recommendation console.

## Run locally
1) `cd frontend`
2) `npm install`
3) `npm run dev` (default http://localhost:5173)

## Environment
- `VITE_API_BASE_URL` (optional): backend origin for `/stats`, `/pipeline`, `/recommendations`.
  - When empty, the app falls back to `/mock/*.json` in `public/`.
  - For the FastAPI backend in `../backend`, set `VITE_API_BASE_URL=http://localhost:8000`.

Expected JSON contracts:
- `GET /stats` -> `{ reviews, games, users, avg_price, positive_ratio, trends: [{label, value}] }`
- `GET /pipeline` -> `[{ stage, owner, status, updatedAt, details, outputPath }]`
- `GET /recommendations?userId=<id>&limit=<n>&language=<lang>&platform=<os>&priceCap=<max>` -> array of `{ appId, title, score, reason, tags[], price, platforms[], language }`

## Pages
- Dashboard: curated counts, trend chart, pipeline ownership cards.
- Recommendations: filter form + recommendation list (mocked until API wired).
- Data Explorer: Hive/Athena query snippets and S3 table paths for Person2/3.

## Folder layout
- `src/components` reusable UI (charts, cards, filters)
- `src/pages` page-level views routed via `react-router-dom`
- `src/services/api.ts` fetch helpers with mock fallback
- `public/mock` sample JSON so UI renders before backend is ready
