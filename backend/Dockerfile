# Stage 1: Build Spring Boot application JAR
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app

COPY pom.xml ./
COPY src ./src

RUN mvn package -DskipTests

# Stage 2: Production JRE runner environment
FROM eclipse-temurin:21-jre-alpine AS runner
WORKDIR /app

ENV BACKEND_PORT=8080

# Create non-root system user
RUN addgroup -S springgroup && adduser -S springuser -G springgroup && \
    chown -R springuser:springgroup /app

COPY --from=builder /app/target/platform-backend-*.jar /app/app.jar

USER springuser

EXPOSE 8080

HEALTHCHECK --interval=5s --timeout=3s --start-period=15s --retries=10 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

CMD ["java", "-jar", "app.jar"]
