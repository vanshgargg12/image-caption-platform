# Development Guide

## Prerequisites

| Tool    | Version / Notes                                      |
|---------|------------------------------------------------------|
| Node.js | 20+ (22 recommended)                                 |
| npm     | 10+                                                  |
| Java    | 21 LTS (JDK 21 or compatible newer JDK for builds)   |
| Maven   | 3.9+                                                 |

Copy environment variables from the repository root before running services:

```bash
cp .env.example .env
```

Adjust values as needed. See `.env.example` for documented variables.

## Repository Layout

```
frontend/       Next.js public UI
backend/        Spring Boot public API
inference/      Internal Node.js inference service
contracts/      OpenAPI specs (future)
infrastructure/ Docker and deployment (future)
evaluation/     Benchmarks and evaluation scripts (future)
docs/           Product and architecture documentation
```

## Running Services Independently

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run build
```

Set `NEXT_PUBLIC_API_BASE_URL` to point at the backend (default in `.env.example`:
`http://localhost:8080`).

### Backend

```bash
cd backend
mvn spring-boot:run    # http://localhost:8080
mvn test
mvn package
```

Health check:

```bash
curl http://localhost:8080/api/v1/health
```

Environment variables: `BACKEND_PORT`, `INFERENCE_BASE_URL` (used in later phases).

### Inference (internal)

```bash
cd inference
npm install
npm run dev        # http://localhost:3001
npm run lint
npm test
npm run build
```

Health checks (internal only):

```bash
curl http://localhost:3001/internal/health
curl http://localhost:3001/internal/ready
```

Environment variables: `INFERENCE_PORT`, `MODEL_ID`, `MODEL_REVISION`, `MODEL_CACHE_DIR`.

## Verification Checklist

After changes, run lint/build/test for each affected service and report exact commands
and outcomes. Do not claim success without running the commands.

## Language Policy

This project does **not** use Python. Use TypeScript (frontend, inference) and Java
(backend) only.
