# Inference Service

Internal Node.js service for Transformers.js image captioning.

## Endpoints

| Method | Path              | Description                          |
|--------|-------------------|--------------------------------------|
| GET    | `/internal/health`| Liveness check                       |
| GET    | `/internal/ready` | Readiness; reports model load state  |

## Commands

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
```

## Environment Variables

See repository root `.env.example`: `INFERENCE_PORT`, `MODEL_ID`, `MODEL_REVISION`,
`MODEL_CACHE_DIR`.

## Current Status

Health and readiness endpoints are implemented. Model loading and caption inference are
not implemented yet; `/internal/ready` reports `model.loaded: false`.
