# Contributing

Thank you for contributing to the Image Caption Platform.

## Before You Start

1. Read [docs/product-requirements.md](docs/product-requirements.md) and
   [docs/decisions/0001-system-boundaries.md](docs/decisions/0001-system-boundaries.md).
2. Follow the constraints in [.cursor/rules/image-caption-platform.mdc](.cursor/rules/image-caption-platform.mdc).
3. Do **not** introduce Python into runtime, scripts, tests, evaluation, or deployment.

## Development Setup

See [docs/development.md](docs/development.md) for prerequisites and commands to run
each service locally.

## Workflow

1. Inspect existing code in the area you are changing.
2. Keep changes scoped to the requested phase.
3. Run lint, test, and build commands for affected services before opening a PR.
4. Include documentation and verification commands for completed work.
5. Never claim tests or builds pass unless you ran them.

## Code Style

- TypeScript: strict mode enabled in frontend and inference services.
- Java: Java 21 target; follow standard Spring Boot conventions.
- Use structured API errors with stable machine-readable codes (when implementing APIs).

## What Not to Add During MVP

Authentication, batch processing, OCR, object detection, Redis, Kafka, Kubernetes,
or permanent image storage by default.
