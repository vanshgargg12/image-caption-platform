# Baseline Test Results

This document records the baseline test suite results across all monorepo components before any changes were made.

**Date & Time**: 2026-10-11T08:16:30+05:30  
**Git Branch**: `fix/baseline-test-results`  
**Environment**: macOS (Darwin 27.0.1 aarch64), Docker Desktop 29.5.2, Node.js v20+, OpenJDK 25.0.2, Apache Maven 3.9.14

---

## Summary Overview

| Component | Command | Result | Tests Total | Passed | Failed | Skipped | Notes / Warnings |
|---|---|---|---|---|---|---|---|
| **Inference** | `npm run lint && npm test` | **PASS** | 31 | 31 | 0 | 0 | ESLint passed (0 errors, 0 warnings) |
| **Backend (Default/Offline)** | `mvn test` | **PASS** | 33 | 32 | 0 | 1 | `./mvnw` wrapper absent, system `mvn` used; `PostgresIntegrationTest` skipped via JUnit Assumption when Docker is absent or without Docker flags |
| **Backend (With Docker & Flags)** | `mvn test -Dapi.version=1.44 -Dspring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect` | **PASS** | 33 | 33 | 0 | 0 | All 33 tests passed including Testcontainers PostgreSQL integration test |
| **Frontend** | `npm run lint && npm test` | **PASS** | 10 | 10 | 0 | 0 | ESLint passed with 1 warning (`react-hooks/incompatible-library` in `FeedbackForm.tsx`) |
| **Evaluation** | `npm --prefix evaluation run test` | **PASS** | 3 | 3 | 0 | 0 | Optional package verified |

---

## 1. Inference Service (`inference/`)

### Lint
- **Command**: `npm run lint`
- **Tool**: ESLint (`eslint .`)
- **Status**: PASSED (0 errors, 0 warnings)

### Tests
- **Command**: `npm test`
- **Runner**: Node.js Test Runner (`node --import tsx --test test/**/*.test.ts`)
- **Status**: PASSED
- **Duration**: ~4.7s

#### Results by Suite
1. **`generateCaption (mocked model test)`** (3/3 passed)
   - `successfully generates a caption using a mocked model pipeline without network calls`: PASS
   - `reuses the singleton model loader across multiple generateCaption calls`: PASS
   - `throws CaptionGenerationError if the model pipeline throws an inference error`: PASS

2. **`loadConfig`** (3/3 passed)
   - `returns default values when environment variables are not set`: PASS
   - `respects custom environment variables`: PASS
   - `throws an error if INFERENCE_PORT is invalid`: PASS

3. **`HTTP Internal Inference Service`** (12/12 passed)
   - `GET /internal/health returns UP without checking model load status`: PASS
   - `GET /internal/ready returns 503 when model is not ready`: PASS
   - `GET /internal/ready returns 200 when model is loaded`: PASS
   - `POST /internal/infer generates caption successfully for valid multipart JPEG`: PASS
   - `POST /internal/infer generates caption successfully for temp files with .tmp extension`: PASS
   - `POST /internal/infer returns 503 when model is unavailable or not ready`: PASS
   - `POST /internal/infer returns 400 when missing image file part`: PASS
   - `POST /internal/infer returns 400 when uploaded file is empty (0 bytes)`: PASS
   - `POST /internal/infer returns 400 when file content header is invalid/unsupported`: PASS
   - `POST /internal/infer returns 400 for invalid or reserved caption mode`: PASS
   - `POST /internal/infer cleans up temporary files on success and failure`: PASS
   - `POST /internal/infer processes concurrent requests serially without failing`: PASS

4. **`internal routes`** (2/2 passed)
   - `GET /internal/health returns UP`: PASS
   - `GET /internal/ready reports no model loaded yet`: PASS

5. **`CaptionModel Provider Abstraction & Registry`** (5/5 passed)
   - `VitGpt2CaptionModel supports SHORT mode and rejects DETAILED mode`: PASS
   - `Florence2CaptionModel supports SHORT, DETAILED, OCR, OD, and REGION_DESCRIPTIONS`: PASS
   - `VitGpt2CaptionModel throws UnsupportedModeError when invoked with unsupported DETAILED mode`: PASS
   - `ModelRegistry registers and resolves models by ID and friendly aliases`: PASS
   - `ModelRegistry lists registered models and capabilities`: PASS

6. **`validateImagePath`** (6/6 passed)
   - `throws ImageValidationError if path is empty or missing`: PASS
   - `throws ImageValidationError if file does not exist`: PASS
   - `throws ImageValidationError for unsupported file extensions`: PASS
   - `throws ImageValidationError if file content headers do not match JPEG/PNG`: PASS
   - `returns resolved path for a valid JPEG image file`: PASS
   - `returns resolved path for a valid PNG image file`: PASS

---

## 2. Backend Service (`backend/`)

### Tests
- **Command (Full Execution)**:
  ```bash
  mvn test -Dapi.version=1.44 -Dspring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
  ```
- **Framework**: Spring Boot Test (JUnit 5, MockMvc, H2, Flyway, Testcontainers)
- **Status**: PASSED (`BUILD SUCCESS`)
- **Total Tests Run**: 33
- **Passed**: 33
- **Skipped**: 0
- **Failures**: 0
- **Errors**: 0

#### Results by Test Class
1. `com.imagecaption.platform.ImageCaptionPlatformApplicationTests`: 1 run, 1 passed, 0 skipped
2. `com.imagecaption.platform.api.CaptionControllerTest`: 4 run, 4 passed, 0 skipped
3. `com.imagecaption.platform.api.FeedbackControllerTest`: 2 run, 2 passed, 0 skipped
4. `com.imagecaption.platform.api.HealthControllerTest`: 1 run, 1 passed, 0 skipped
5. `com.imagecaption.platform.integration.CaptionIntegrationTest`: 6 run, 6 passed, 0 skipped
6. `com.imagecaption.platform.integration.PostgresIntegrationTest`: 1 run, 1 passed, 0 skipped
   - *Test Details*: Verified Flyway migration v1 against real PostgreSQL container (`postgres:16-alpine`), entity persistence, and schema validation.
7. `com.imagecaption.platform.provider.TransformersJsCaptionProviderTest`: 1 run, 1 passed, 0 skipped
8. `com.imagecaption.platform.repository.CaptionRequestRepositoryTest`: 1 run, 1 passed, 0 skipped
9. `com.imagecaption.platform.repository.FeedbackRepositoryTest`: 1 run, 1 passed, 0 skipped
10. `com.imagecaption.platform.service.CaptionServiceTest`: 4 run, 4 passed, 0 skipped
11. `com.imagecaption.platform.service.FeedbackServiceTest`: 2 run, 2 passed, 0 skipped
12. `com.imagecaption.platform.util.ImageValidatorTest`: 9 run, 9 passed, 0 skipped

---

## 3. Frontend Service (`frontend/`)

### Lint
- **Command**: `npm run lint`
- **Tool**: ESLint (`eslint`)
- **Status**: PASSED (0 errors, 1 warning)
  - `components/FeedbackForm.tsx`: line 40 warning `react-hooks/incompatible-library` (React Compiler note on `watch('rating')` from `react-hook-form`).

### Tests
- **Command**: `npm test`
- **Runner**: Vitest (`npx vitest run`)
- **Status**: PASSED
- **Test Files**: 2 passed (2 total)
- **Tests**: 10 passed (10 total)

#### Results by Test File
1. `test/FileUploadZone.test.tsx`: 6 passed
2. `test/CaptionResultCard.test.tsx`: 4 passed

---

## 4. Evaluation Service (`evaluation/`)

### Tests
- **Command**: `npm --prefix evaluation run test`
- **Runner**: Node.js Test Runner (`node --import tsx --test test/**/*.test.ts`)
- **Status**: PASSED
- **Tests**: 3 passed (0 failed, 3 total)
  - `evaluateSample accurately assesses ground truth overlap and missing objects`: PASS
  - `evaluateSample flags missing objects when expected items are absent`: PASS
  - `summarizeMetrics aggregates group scores by source and model`: PASS

---

## Notes on Test Execution Environment

1. **Testcontainers & Docker 29+**:
   - Docker Desktop 29.5.2 sets `MinAPIVersion: 1.40`. Testcontainers 1.20.4's default client attempts an older API version unless `-Dapi.version=1.44` (or `api.version=1.44`) is set.
2. **Hibernate Dialect in Tests**:
   - `application-test.properties` explicitly pins `spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect`. When executing `PostgresIntegrationTest` against real PostgreSQL with `spring.jpa.hibernate.ddl-auto=validate`, supplying `-Dspring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect` allows Hibernate to validate PostgreSQL's native `timestamptz` column types accurately.
