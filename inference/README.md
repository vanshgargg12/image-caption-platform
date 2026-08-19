# Inference Service

Internal Node.js service providing ONNX-based image captioning via `@huggingface/transformers` without Python dependencies.

> [!WARNING]
> **Security Notice**: This service is strictly **internal-only** (designed to run behind the Spring Boot backend or internal container network). It MUST NOT be exposed directly to the public internet.

---

## HTTP Endpoints

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/internal/health` | Liveness check (returns 200 OK process running; does not require model to be loaded) | Internal |
| `GET` | `/internal/ready` | Readiness check (returns 200 OK when model loaded; 503 Service Unavailable when loading or failed) | Internal |
| `POST` | `/internal/infer` | Perform image captioning (accepts `multipart/form-data`) | Internal |

---

## API Specifications

### `POST /internal/infer`

#### Request Format
* `Content-Type`: `multipart/form-data`
* **Parts**:
  - `image` (file, required): JPEG (`.jpg`, `.jpeg`) or PNG (`.png`) file up to `MAX_IMAGE_SIZE_BYTES` (default 10 MB).
  - `mode` (text field, optional): Captioning mode. Supported MVP mode: `SHORT` (default). Reserved for future phases: `DETAILED`, `OCR`, `OBJECT_DETECTION`.

#### Successful Response (200 OK)

```json
{
  "caption": "a dog running across a green grassy field",
  "model": "Xenova/vit-gpt2-image-captioning",
  "modelVersion": "main",
  "mode": "SHORT",
  "inferenceTimeMs": 340,
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Error Response Format (4xx / 5xx)

```json
{
  "timestamp": "2026-08-19T20:00:00.000Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "code": "UNSUPPORTED_IMAGE_TYPE",
  "message": "File headers do not match a valid JPEG or PNG image.",
  "details": null
}
```

#### Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `MISSING_IMAGE_FILE` | 400 | No `image` file part was present in the multipart request |
| `EMPTY_FILE` | 400 | Uploaded image file was 0 bytes |
| `UNSUPPORTED_IMAGE_TYPE` | 400 | File headers/extension do not match JPEG or PNG |
| `INVALID_CAPTION_MODE` | 400 | Requested mode is unknown or reserved |
| `PAYLOAD_TOO_LARGE` | 413 | Uploaded image exceeds max file size |
| `MODEL_NOT_READY` | 503 | Model is still loading or failed to load |
| `SERVICE_BUSY` | 503 | Maximum concurrent inference requests exceeded |
| `INFERENCE_TIMEOUT` | 504 | Inference request timed out |

---

## Concurrency & Resource Management

* **Concurrency**: Limited to **1 concurrent inference request** to avoid CPU & RAM exhaustion. Additional incoming requests are queued up to maximum queue capacity.
* **Temporary Storage**: Uploaded multipart images are written to temporary disk locations during execution and strictly cleaned up in a `finally` block on both success and error paths.
* **Timeouts**: Inference execution is bound by `INFERENCE_TIMEOUT_MS` (default 30 seconds).

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `INFERENCE_PORT` | `3001` | Server listening port |
| `MODEL_ID` | `Xenova/vit-gpt2-image-captioning` | Hugging Face model repository ID |
| `MODEL_REVISION` | `main` | Pinned model revision / commit SHA |
| `MODEL_CACHE_DIR` | `.model-cache` | Local directory for storing ONNX model weights |
| `MAX_IMAGE_SIZE_BYTES` | `10485760` | Max upload size in bytes (10MB) |
| `INFERENCE_TIMEOUT_MS` | `30000` | Inference timeout in milliseconds |
| `MAX_CONCURRENT_INFERENCE` | `1` | Max concurrent inference execution tasks |

---

## Development Commands

```bash
npm install
npm run dev        # Run server with live reload
npm run caption -- /path/to/image.jpg # CLI captioning spike
npm run lint       # Run ESLint
npm test           # Run unit and integration tests (mocked model)
npm run build      # Compile TypeScript build
npm start          # Run compiled production server
```
