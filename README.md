# Image Caption Platform

Upload an image and receive an AI-generated caption. The platform is a monorepo featuring a Next.js App Router frontend, a Spring Boot public backend, a PostgreSQL database, and an internal Node.js inference service powered by Transformers.js (ViT-GPT2 ONNX model).

**This project does not use Python.** Runtime, scripts, tests, evaluation, and deployment are TypeScript and Java only.

---

## 1. System Boundaries & Architecture

```
[ Browser Client ] -> [ Next.js Frontend ] -> [ Spring Boot Backend ] -> [ Node.js Inference Service ]
                                                      |
                                                      v
                                            [ PostgreSQL Database ]
```

| Service | Stack | Exposure | Responsibility |
|---|---|---|---|
| **Frontend** | Next.js 16, React 19, TS, Tailwind CSS | Public (`:3000`) | Web UI; calls backend API only |
| **Backend** | Java 21, Spring Boot 3.4, JPA, Flyway | Public (`:8080`) | Public API, validation, PostgreSQL persistence |
| **Inference** | Node.js 20, TS, Transformers.js (ONNX) | Internal (`:3001`) | Model loading & caption generation |
| **Database** | PostgreSQL 16 Alpine | Internal (`:5432`) | Persistent metadata & user feedback storage |

The browser **never** calls the inference service directly. See [docs/decisions/0001-system-boundaries.md](docs/decisions/0001-system-boundaries.md).

---

## 2. Docker Containerization & Local Startup

### Prerequisites
- Docker Engine 24+ and Docker Compose v2+
- Recommended RAM: **2GB - 4GB**

### First-Time Local Startup

1. Copy environment template:
   ```bash
   cp .env.example .env
   ```

2. Start the full multi-container platform:
   ```bash
   docker compose -f infrastructure/docker-compose.yml up -d --build
   ```

   > [!NOTE]
   > **First-Start Model Download**: On initial startup, the inference service container downloads the ViT-GPT2 ONNX model weights (~98MB) into the persistent volume `huggingface_cache`. The backend service waits for `/internal/ready` probe to succeed before accepting requests.

3. Verify running services:
   ```bash
   docker compose -f infrastructure/docker-compose.yml ps
   ```

4. Run automated end-to-end smoke test:
   ```bash
   bash infrastructure/smoke-test.sh
   ```

---

## 3. Development Stack (Exposing DB & Inference Ports)

To expose PostgreSQL (`:5432`) and the Inference Service (`:3001`) to localhost for local debugging:

```bash
docker compose -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml up -d
```

---

## 4. Documentation Links

- [Containerization & Deployment Guide](docs/containerization-and-deployment.md)
- [API OpenAPI Specifications](contracts/README.md)
- [Model Feasibility & Benchmarking Report](docs/model-feasibility.md)
- [Development Guide](docs/development.md)

---

## 5. License & Contributing

See [LICENSE](LICENSE) and [CONTRIBUTING.md](CONTRIBUTING.md).
