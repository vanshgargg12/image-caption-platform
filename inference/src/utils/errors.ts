import type { FastifyReply, FastifyRequest } from "fastify";
import {
  ConcurrencyLimitError,
  ImageValidationError,
  InferenceTimeoutError,
  InferErrorResponse,
  ModelLoadError,
} from "../model/types.js";
import { UnsupportedModeError } from "../model/providers/types.js";

export function createErrorResponse(
  requestId: string,
  code: string,
  message: string,
  details: unknown = null
): InferErrorResponse {
  return {
    timestamp: new Date().toISOString(),
    requestId,
    code,
    message,
    details,
  };
}

export function handleInferenceError(
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const requestId = (request.headers["x-request-id"] as string) || request.id || "unknown";

  if (error instanceof UnsupportedModeError) {
    reply.status(400).send(createErrorResponse(requestId, error.code, error.message));
    return;
  }

  if (error instanceof ImageValidationError) {
    const statusCode = error.code === "PAYLOAD_TOO_LARGE" ? 413 : 400;
    reply.status(statusCode).send(createErrorResponse(requestId, error.code, error.message));
    return;
  }

  if (error instanceof ConcurrencyLimitError) {
    reply
      .status(503)
      .send(
        createErrorResponse(
          requestId,
          "SERVICE_BUSY",
          "Service is currently processing maximum concurrent requests."
        )
      );
    return;
  }

  if (error instanceof InferenceTimeoutError) {
    reply
      .status(504)
      .send(createErrorResponse(requestId, "INFERENCE_TIMEOUT", error.message));
    return;
  }

  if (error instanceof ModelLoadError) {
    reply
      .status(503)
      .send(
        createErrorResponse(
          requestId,
          "MODEL_NOT_READY",
          "Image captioning model is not loaded or failed to initialize."
        )
      );
    return;
  }

  // Handle Fastify FST_ERR_CTP_INVALID_MEDIA_TYPE or multipart limits
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fastifyErr = error as any;
  if (fastifyErr?.code === "FST_ERR_CTP_INVALID_MEDIA_TYPE" || fastifyErr?.statusCode === 415) {
    reply
      .status(400)
      .send(
        createErrorResponse(
          requestId,
          "INVALID_MEDIA_TYPE",
          "Request content-type must be multipart/form-data."
        )
      );
    return;
  }

  if (fastifyErr?.code === "FST_ERR_MULTIPART_FILE_TOO_LARGE" || fastifyErr?.statusCode === 413) {
    reply
      .status(413)
      .send(
        createErrorResponse(
          requestId,
          "PAYLOAD_TOO_LARGE",
          "Uploaded file size exceeds the maximum allowed limit."
        )
      );
    return;
  }

  // Fallback for unexpected internal errors (hide stack trace from client)
  const message =
    error instanceof Error ? error.message : "An unexpected server error occurred.";

  request.log.error({ err: error, requestId }, "Unhandled inference error");

  reply
    .status(500)
    .send(createErrorResponse(requestId, "INTERNAL_SERVER_ERROR", message));
}
