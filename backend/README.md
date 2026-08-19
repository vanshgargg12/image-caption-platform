# Image Caption Platform Backend

Spring Boot REST API service exposing public caption generation, request status retrieval, feedback recording, and health check endpoints.

---

## Technical Stack

- **Java Version**: Java 21 LTS
- **Framework**: Spring Boot 3.4.1 (Spring Web, Spring Data JPA, Spring Validation, Spring Boot Actuator)
- **Database**: PostgreSQL with Flyway Migrations (`db/migration/V1__init_schema.sql`)
- **OpenAPI / Swagger**: Springdoc OpenAPI v2.8.5 (`/swagger-ui.html` & `/v3/api-docs`)
- **Inference Integration**: `CaptionProvider` interface & `TransformersJsCaptionProvider` implementation with controlled transient retries
- **Testing**: JUnit 5, Mockito, Spring Boot MockMvc, DataJpaTest (H2), Testcontainers PostgreSQL container (`PostgresIntegrationTest`)

---

## API Endpoints

| HTTP Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Service liveness health check |
| `POST` | `/api/v1/captions` | Submit image multipart upload for caption generation |
| `GET` | `/api/v1/captions/{id}` | Retrieve request status and generated caption |
| `POST` | `/api/v1/captions/{id}/feedback` | Record user feedback rating and comments |

---

## Configuration Properties

| Property | Default Value | Environment Variable | Description |
|---|---|---|---|
| `server.port` | `8080` | `BACKEND_PORT` | HTTP server port |
| `spring.datasource.url` | `jdbc:postgresql://localhost:5432/image_caption` | `DATABASE_URL` | PostgreSQL connection URL |
| `spring.datasource.username` | `image_caption` | `POSTGRES_USER` | Database username |
| `spring.datasource.password` | `change-me` | `POSTGRES_PASSWORD` | Database password |
| `inference.base-url` | `http://localhost:3001` | `INFERENCE_BASE_URL` | Internal inference service base URL |
| `inference.client.connect-timeout-ms` | `5000` | `INFERENCE_CONNECT_TIMEOUT_MS` | Inference client connection timeout |
| `inference.client.read-timeout-ms` | `30000` | `INFERENCE_READ_TIMEOUT_MS` | Inference client read timeout |
| `inference.client.max-retries` | `2` | `INFERENCE_MAX_RETRIES` | Max retries for transient 5xx/IO errors |
| `cors.allowed-origins` | `http://localhost:3000` | `CORS_ALLOWED_ORIGINS` | Allowed CORS origins (comma-separated) |

---

## Key Design Principles

1. **Security & Temporary File Lifecycle**:
   - Image bytes are **never** stored in PostgreSQL.
   - Uploaded content is validated against magic byte headers (`0xFFD8FF` for JPEG, `0x89504E470D0A1A0A` for PNG). Client MIME headers are not trusted.
   - Temporary upload files are written to disk and deleted in a `finally` block on **every** code path.
2. **Transient-Only Retry Policy**:
   - Retries up to 2 times for transient network failures or 503/504 errors from the internal inference service.
   - **Does NOT retry** 400 (invalid image / bad mode) or 413 (payload too large) client errors.
3. **OpenAPI / DTO Mapping**:
   - Entities (`CaptionRequestEntity`, `FeedbackEntity`) are mapped to clean DTO records (`CaptionRequestDto`, `FeedbackResponseDto`). JPA entities are never exposed directly to clients.

---

## Development Commands

```bash
# Run application locally
mvn spring-boot:run

# Run full test suite (Unit, Controller, Repository & Integration tests)
mvn test

# Build executable JAR artifact
mvn package -DskipTests
```

---

## Swagger UI & API Documentation

When the application is running:
- **Interactive Swagger UI**: `http://localhost:8080/swagger-ui.html`
- **OpenAPI JSON Spec**: `http://localhost:8080/v3/api-docs`
