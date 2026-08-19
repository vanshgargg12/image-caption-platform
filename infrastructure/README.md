# Infrastructure

Docker, deployment, and environment configuration for the Image Caption Platform will
live here.

## Planned Contents

- Docker Compose for local multi-service development
- Service Dockerfiles (frontend, backend, inference)
- Environment-specific configuration templates

## Current Status

Not started. Docker Compose and PostgreSQL are explicitly deferred until after minimal
services are verified independently.

## Design Notes

- Inference must remain an internal service (not exposed to the public internet).
- Model cache volume mounts should use `MODEL_CACHE_DIR` without committing binaries.
