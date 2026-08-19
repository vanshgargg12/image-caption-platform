# ADR 0001: System Boundaries

## Status

Accepted

## Context

The platform generates image captions using a Transformers.js model. We need clear
boundaries between public-facing components and internal infrastructure to keep the
inference service isolated and simplify security and deployment.

## Decision

1. **Public components**
   - **Frontend (Next.js):** Serves the web UI. Talks only to the backend API.
   - **Backend (Spring Boot):** Sole public API. Validates uploads and orchestrates
     caption requests.

2. **Internal components**
   - **Inference (Node.js + Transformers.js):** Loads the ONNX-compatible model once,
     serves caption generation. Not reachable from the browser.

3. **Request flow**

   ```
   Browser → Frontend → Backend → Inference
   ```

4. **Model choice (MVP)**
   - Start with `Xenova/vit-gpt2-image-captioning` with a pinned revision.
   - Defer Florence-2 until the basic end-to-end application works.

5. **No Python** in runtime, scripts, tests, evaluation, or deployment.

## Consequences

- Backend must proxy or call inference; frontend env vars reference the backend only
  (`NEXT_PUBLIC_API_BASE_URL`).
- Inference exposes internal health/readiness endpoints under `/internal/*`.
- Network policies and Docker Compose (future) can restrict inference to backend-only
  access.
- Model loading and caching live entirely in the inference service.

## Out of Scope (MVP)

Authentication, batch APIs, OCR, object detection, Redis, Kafka, Kubernetes, and
permanent image storage by default.
