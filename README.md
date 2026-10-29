# Headcount

> Know who'll show up before you sign the offer.

Headcount is a multi-agent tool for independent promoters and venue talent buyers. Give it an act, a city, a room size and a proposed guarantee, and it uses Qloo's taste graph to estimate local demand and recommend **Go / Resize / Pass**.

🚧 Work in progress for the [Qloo Agentic Hackathon](https://qloo.devpost.com/). This README will document only features that are built and tested.

## Layout
- `api/`: FastAPI + agents (Python, uv) → Google Cloud Run
- `web/`: Next.js frontend → Vercel

## Run the API locally
```bash
cp .env.example .env   # add your QLOO_API_KEY (hackathon key) and GEMINI_API_KEY
cd api && uv sync && uv run uvicorn headcount.main:app --reload
```

## License
MIT
