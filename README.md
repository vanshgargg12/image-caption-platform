# Image Caption Platform

Upload an image and receive an AI-generated caption. The platform is a monorepo with a
Next.js frontend, a Spring Boot public API, and an internal Node.js inference service
powered by Transformers.js (ONNX-compatible models).

**This project does not use Python.** Runtime, scripts, tests, evaluation, and deployment
are TypeScript and Java only.

## System Boundaries

| Service    | Stack              | Exposure | Responsibility                          |
|------------|--------------------|----------|-----------------------------------------|
| Frontend   | Next.js, React, TS | Public   | Web UI; calls backend API only          |
| Backend    | Java 21, Spring    | Public   | Public API, validation, orchestration   |
| Inference  | Node.js, TS        | Internal | Model load and caption generation       |

```
Browser → Frontend → Backend → Inference
```

The browser **never** calls the inference service directly. See
[docs/decisions/0001-system-boundaries.md](docs/decisions/0001-system-boundaries.md).

## Repository Structure

```
image-caption-platform/
├── frontend/        Next.js UI
├── backend/         Spring Boot public API
├── inference/       Internal Transformers.js service
├── contracts/       OpenAPI specs and shared schemas
├── infrastructure/  Docker and deployment (future)
├── evaluation/      Benchmarks and evaluation (future)
├── docs/            Product and architecture docs
├── .env.example     Documented environment variables
└── README.md
```

## Prerequisites

- Node.js 20+ and npm 10+
- Java 21 LTS and Maven 3.9+

Copy environment variables:

```bash
cp .env.example .env
```

## Run Each Service Independently

### Frontend (port 3000)

```bash
cd frontend
npm install
npm run dev
```

### Backend (port 8080)

```bash
cd backend
mvn spring-boot:run
curl http://localhost:8080/api/v1/health
```

### Inference — internal (port 3001)

```bash
cd inference
npm install
npm run dev
curl http://localhost:3001/internal/health
curl http://localhost:3001/internal/ready
```

See [docs/development.md](docs/development.md) for lint, test, and build commands.

## Current Project Status

| Area              | Status                                              |
|-------------------|-----------------------------------------------------|
| Monorepo layout   | Done                                                |
| Frontend scaffold | Minimal page with project name and status placeholder |
| Backend scaffold  | `GET /api/v1/health` + tests                        |
| Inference scaffold| `GET /internal/health`, `GET /internal/ready` + tests |
| Model inference   | Not implemented (`/internal/ready` reports no model) |
| Image upload API  | Not implemented                                     |
| Docker / Postgres | Not implemented                                     |

Target model for MVP: `Xenova/vit-gpt2-image-captioning` (pinned revision). Florence-2
is deferred until the basic end-to-end flow works.

## License

See [LICENSE](LICENSE). A formal license has not been selected yet.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
