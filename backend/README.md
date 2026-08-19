# Backend

Spring Boot public API for the Image Caption Platform.

## Requirements

- Java 21 LTS
- Maven 3.9+

## Commands

```bash
mvn spring-boot:run
mvn test
mvn package
```

## Health Check

```bash
curl http://localhost:8080/api/v1/health
```

Expected response:

```json
{"status":"UP","service":"backend"}
```

## Environment Variables

See repository root `.env.example`: `BACKEND_PORT`, `INFERENCE_BASE_URL`.
