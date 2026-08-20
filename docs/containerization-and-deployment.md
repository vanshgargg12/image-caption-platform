# Containerization & Deployment Guide

This document details the container architecture, multi-stage Dockerfiles, network isolation rules, volume persistence, memory guidance, environment variables, and deployment procedures for the Image Caption Platform.

---

## 1. Multi-Tier Architecture Overview

```
+---------------------------------------------------------------------------------------------------+
|  Docker Bridge Network (`caption_network`)                                                       |
|                                                                                                   |
|  +-------------------+       HTTP /api/v1/*       +--------------------+     HTTP /internal/*     |
|  |  Next.js Frontend | -------------------------> |  Spring Boot       | -----------------------+ |
|  |  Container        |                            |  Public Backend    |                        | |
|  +-------------------+                            +--------------------+                        v |
|            | (Port 3000 exposed)                            | (Port 8080 exposed)      +-------------------+
|            v                                                v                        | Node.js Inference |
|       [ Host Browser ]                             [ Public Clients / API ]          | Service Container |
|                                                             |                        +-------------------+
|                                                             v                                 |
|                                                   +-------------------+                       v
|                                                   | PostgreSQL        |             [ Volume: hf_cache ]
|                                                   | Database          |
|                                                   +-------------------+
|                                                             |
|                                                     [ Volume: pg_data ]
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Security & Non-Root Containers

All application containers feature multi-stage builds and execute under unprivileged, non-root system accounts to minimize attack surface area:

| Container Service | Base Image | Non-Root User | Internal Port | Host Port (Production) | Host Port (Dev Override) |
|---|---|---|---|---|---|
| **Next.js Frontend** | `node:20-alpine` | `nextuser` | `3000` | `3000` | `3000` |
| **Spring Boot Backend** | `eclipse-temurin:21-jre-alpine` | `springuser` | `8080` | `8080` | `8080` |
| **Node.js Inference** | `node:20-alpine` | `nodeuser` | `3001` | *Internal Only* | `3001` |
| **PostgreSQL Database** | `postgres:16-alpine` | `postgres` | `5432` | *Internal Only* | `5432` |

> [!IMPORTANT]
> - **No Hardcoded Secrets**: Credentials and API keys are passed dynamically via environment variables (`.env` or Compose environment overrides).
> - **Internal Service Isolation**: In production ([`infrastructure/docker-compose.yml`](file:///Users/vanshgarg/Documents/image-caption-platform/infrastructure/docker-compose.yml)), PostgreSQL (`5432`) and the Inference service (`3001`) are not published to the host network. Development overrides ([`infrastructure/docker-compose.dev.yml`](file:///Users/vanshgarg/Documents/image-caption-platform/infrastructure/docker-compose.dev.yml)) map these ports for local debugging.

---

## 3. Persistent Volumes & Model Caching

| Volume Name | Target Container Path | Purpose & Characteristics |
|---|---|---|
| `postgres_data` | `/var/lib/postgresql/data` | Persists PostgreSQL database state, schema, caption metadata, and user feedback records across container restarts. |
| `huggingface_cache` | `/app/.cache` | Persists downloaded ONNX model weights (`Xenova/vit-gpt2-image-captioning`). Prevents redundant downloads between container restarts. |

> [!WARNING]
> **First-Start Model Download Delay**:
> On initial container startup, the inference service downloads the ONNX vision transformer weights (~98MB) from HuggingFace into `huggingface_cache`. Depending on network bandwidth, this initial download takes **10 to 30 seconds**.
> The readiness healthcheck endpoint (`/internal/ready`) returns HTTP 503 `NOT_READY` until the model download completes, preventing dependent backend services from receiving traffic prematurely. Subsequent restarts reuse the cached weights instantaneously.

---

## 4. Resource & Memory Guidance

For optimal performance, configure Docker Engine with the following recommended minimum resource allocations:

- **Minimum Total Host RAM**: `2.0 GB`
- **Recommended Total Host RAM**: `4.0 GB`
- **CPU Cores**: `2 Cores`

### Per-Service Resource Footprint

| Service | Minimum Memory | Recommended Limit | Rationale |
|---|---|---|---|
| **Node.js Inference Service** | `512 MB` | `1024 MB` | ONNX Runtime vision model execution & image array processing. |
| **Spring Boot Backend** | `384 MB` | `768 MB` | Java 21 Heap & Hikari Connection Pool. |
| **Next.js Frontend** | `256 MB` | `512 MB` | React App Router SSR & static page rendering. |
| **PostgreSQL Database** | `128 MB` | `256 MB` | Database shared buffers & query engine. |

---

## 5. Startup Ordering & Healthchecks

Startup dependencies rely strictly on functional readiness probes rather than arbitrary delay sleeps:

1. **`postgres`**: Probed using `pg_isready -U image_caption -d image_caption`.
2. **`inference`**: Probed using HTTP GET `http://localhost:3001/internal/ready`. Returns 200 OK only after ONNX model weights are fully loaded into memory.
3. **`backend`**: Waits for `postgres` (service_healthy) and `inference` (service_healthy), then probes `http://localhost:8080/actuator/health`.
4. **`frontend`**: Waits for `backend` (service_healthy), then probes `http://localhost:3000`.

---

## 6. Environment Variables Reference

| Variable Name | Default Value | Target Service | Description |
|---|---|---|---|
| `POSTGRES_DB` | `image_caption` | Postgres, Backend | Database name |
| `POSTGRES_USER` | `image_caption` | Postgres, Backend | Database user |
| `POSTGRES_PASSWORD` | `change-me` | Postgres, Backend | Database password |
| `DATABASE_URL` | `jdbc:postgresql://postgres:5432/image_caption` | Backend | JDBC Connection URL |
| `INFERENCE_BASE_URL` | `http://inference:3001` | Backend | Internal inference HTTP endpoint |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8080` | Frontend | Spring Boot public API URL for browser clients |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Backend | Allowed CORS origin URLs |

---

## 7. Execution Commands

### Production-Oriented Stack

```bash
# Start all containers in background
docker compose -f infrastructure/docker-compose.yml up -d --build

# View container status and health
docker compose -f infrastructure/docker-compose.yml ps

# View unified logs
docker compose -f infrastructure/docker-compose.yml logs -f
```

### Development Stack (Exposing DB & Inference Ports)

```bash
docker compose -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml up -d --build
```

---

## 8. Automated End-to-End Smoke Test

Run the automated smoke test script to verify full platform integration:

```bash
bash infrastructure/smoke-test.sh
```
