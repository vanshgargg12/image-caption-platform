# API Contracts & OpenAPI Specifications

This directory contains the API-first OpenAPI 3.0.3 contracts, JSON payload examples, and validation tooling for the Image Caption Platform.

---

## 1. Architecture Overview

The system maintains a clear operational boundary between public-facing client interactions and internal machine-learning inference capabilities:

```
+------------------+         HTTP /api/v1/*         +------------------+         HTTP /internal/*        +-------------------+
|  Next.js Frontend | ---------------------------> | Spring Boot      | -------------------------------> | Node.js Inference |
|  (User Facing)   |                               | Public Backend   |                                  | Service (Internal)|
+------------------+                               +------------------+                                  +-------------------+
```

* **Public API** ([`openapi/public-api.yaml`](file:///Users/vanshgarg/Documents/image-caption-platform/contracts/openapi/public-api.yaml)): Exposed by the Spring Boot backend (`http://localhost:8080`). Manages upload handling, job tracking, persistence, and feedback collection.
* **Internal Inference API** ([`openapi/internal-inference-api.yaml`](file:///Users/vanshgarg/Documents/image-caption-platform/contracts/openapi/internal-inference-api.yaml)): Exposed by the Node.js inference service (`http://localhost:3001`). Must **NOT** be exposed directly to the public internet.

---

## 2. Shared Enums & Data Models

### Enums

| Enum Name | Values | Description |
|---|---|---|
| **`CaptionStatus`** | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` | Caption request lifecycle status |
| **`CaptionMode`** | `SHORT`, `DETAILED` | Generation mode requested by client |
| **`FeedbackRating`** | `POSITIVE`, `NEGATIVE` | User evaluation rating |

### Core Entities

#### `CaptionRequest`
Represents a caption generation request entity stored by the backend.
* `id` (`UUID` string, required)
* `status` (`CaptionStatus`, required)
* `originalFilename` (`string`, required)
* `imageHash` (`string` SHA-256, required)
* `captionMode` (`CaptionMode`, required)
* `modelName` (`string`, required)
* `modelVersion` (`string`, required)
* `generatedCaption` (`string`, nullable)
* `editedCaption` (`string`, nullable)
* `inferenceTimeMs` (`int64`, nullable)
* `createdAt` (`ISO-8601 date-time` string, required)
* `completedAt` (`ISO-8601 date-time` string, nullable)
* `errorCode` (`string`, nullable)

#### `Feedback`
User evaluation feedback submitted for a caption.
* `id` (`UUID` string, required)
* `captionRequestId` (`UUID` string, required)
* `rating` (`FeedbackRating`, required)
* `missingInformation` (`string`, nullable)
* `incorrectInformation` (`string`, nullable)
* `userComment` (`string`, nullable)
* `createdAt` (`ISO-8601 date-time` string, required)

#### `ErrorResponse`
Standardized error payload returned across all endpoints (public and internal):
```json
{
  "timestamp": "2026-08-19T20:20:00.000Z",
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "code": "UNSUPPORTED_IMAGE_TYPE",
  "message": "File headers do not match a valid JPEG or PNG image.",
  "details": null
}
```

---

## 3. Discrepancy & Alignment Analysis

The table below documents intentional alignments and operational differences between the internal Node.js inference service implementation and the API specifications:

| Feature / Property | Public API Specification | Internal Inference Service | Status & Notes |
|---|---|---|---|
| **Caption Mode (`SHORT`)** | `SHORT` supported | `SHORT` supported | **Fully Aligned** |
| **Caption Mode (`DETAILED`)** | `DETAILED` supported in contract | `DETAILED` reserved (returns `400 INVALID_CAPTION_MODE`) | **Intentional MVP Limitation**: Reserved for future multi-stage models. |
| **Field Naming (`modelVersion`)** | `modelVersion` | `modelVersion` in `POST /internal/infer` | **Fully Aligned** |
| **Field Naming (`modelRevision`)** | N/A | `modelRevision` in `GET /internal/ready` | **Aligned**: Readiness object reports HuggingFace `modelRevision` git ref. |
| **Max Payload Size** | 10 MB limit (`413`) | `MAX_IMAGE_SIZE_BYTES=10485760` | **Fully Aligned** |
| **Stack Trace Policy** | Suppressed from clients | Suppressed from clients | **Fully Aligned** |

---

## 4. Contract Validation Tooling

Contract validation is enforced using `@redocly/cli` (a maintained Node.js/npm tool without Python dependencies).

### Running Validation

From the `contracts` directory:

```bash
npm install
npm run lint
```

Or run directly via `redocly`:

```bash
redocly lint openapi/*.yaml
```
