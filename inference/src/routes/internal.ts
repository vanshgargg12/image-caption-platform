import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { loadConfig } from "../config.js";
import { ModelRegistry } from "../model/providers/modelRegistry.js";
import { CaptionMode } from "../model/providers/types.js";
import { globalInferenceQueue } from "../model/queue.js";
import { getModelState } from "../model/state.js";
import { ImageValidationError } from "../model/types.js";
import { createErrorResponse, handleInferenceError } from "../utils/errors.js";

export async function registerInternalRoutes(app: FastifyInstance): Promise<void> {
  app.get("/internal/health", async () => ({
    status: "UP",
    service: "inference",
  }));

  app.get("/internal/ready", async (_request: FastifyRequest, reply: FastifyReply) => {
    const model = getModelState();

    if (!model.loaded) {
      reply.status(503);
      return {
        status: "NOT_READY",
        service: "inference",
        model: {
          loaded: false,
          modelId: model.modelId,
          modelRevision: model.modelRevision,
          error: model.error,
        },
      };
    }

    reply.status(200);
    return {
      status: "READY",
      service: "inference",
      model: {
        loaded: true,
        modelId: model.modelId,
        modelRevision: model.modelRevision,
        availableModels: ModelRegistry.getInstance().listModels(),
      },
    };
  });

  app.post("/internal/infer", async (request: FastifyRequest, reply: FastifyReply) => {
    const config = loadConfig();
    const requestId =
      (request.headers["x-request-id"] as string) || request.id || randomUUID();

    // Check readiness first
    const modelState = getModelState();
    if (!modelState.loaded) {
      reply
        .status(503)
        .send(
          createErrorResponse(
            requestId,
            "MODEL_NOT_READY",
            "Inference service model is not loaded or ready."
          )
        );
      return;
    }

    let tempFilePath: string | null = null;

    try {
      if (!request.isMultipart()) {
        throw new ImageValidationError(
          "Request content-type must be multipart/form-data.",
          "INVALID_MEDIA_TYPE"
        );
      }

      // Process multipart file and fields
      let fileBuffer: Buffer | null = null;
      let originalFilename = "upload.jpg";
      let modeInput = "SHORT";
      let modelInput: string | undefined = undefined;

      const parts = request.parts({
        limits: { fileSize: config.maxImageSizeBytes },
      });

      for await (const part of parts) {
        if (part.type === "file") {
          if (part.fieldname === "image" || !fileBuffer) {
            fileBuffer = await part.toBuffer();
            originalFilename = part.filename || originalFilename;

            if (part.file.truncated) {
              throw new ImageValidationError(
                `Uploaded image exceeds maximum size of ${config.maxImageSizeBytes} bytes.`,
                "PAYLOAD_TOO_LARGE"
              );
            }
          }
        } else if (part.type === "field") {
          if (part.fieldname === "mode" && typeof part.value === "string") {
            modeInput = part.value.trim().toUpperCase();
          } else if (part.fieldname === "model" && typeof part.value === "string") {
            modelInput = part.value.trim();
          }
        }
      }

      if (!fileBuffer) {
        throw new ImageValidationError(
          "Multipart request must include an 'image' file upload.",
          "MISSING_IMAGE_FILE"
        );
      }

      if (fileBuffer.length === 0) {
        throw new ImageValidationError(
          "Uploaded image file is empty (0 bytes).",
          "EMPTY_FILE"
        );
      }

      if (fileBuffer.length > config.maxImageSizeBytes) {
        throw new ImageValidationError(
          `Uploaded image exceeds maximum size of ${config.maxImageSizeBytes} bytes.`,
          "PAYLOAD_TOO_LARGE"
        );
      }

      // Resolve model from ModelRegistry
      const captionModel = ModelRegistry.getInstance().getModel(modelInput || config.modelId);

      // Validate mode capability
      const targetMode = modeInput as CaptionMode;
      if (!captionModel.supportsMode(targetMode)) {
        throw new ImageValidationError(
          `Model '${captionModel.id}' does not support caption mode '${modeInput}'. Supported modes: ${Array.from(captionModel.capabilities).join(", ")}`,
          "UNSUPPORTED_CAPTION_MODE"
        );
      }

      // Save file buffer to temporary disk location for validation & inference
      const ext = path.extname(originalFilename) || ".jpg";
      tempFilePath = path.join(
        os.tmpdir(),
        `infer_${requestId}_${Date.now()}${ext}`
      );
      fs.writeFileSync(tempFilePath, fileBuffer);

      // Execute queued inference
      const result = await globalInferenceQueue.run(
        () => captionModel.generate(tempFilePath!, targetMode, { requestId }),
        config.inferenceTimeoutMs
      );

      request.log.info(
        {
          requestId,
          model: result.model,
          modelVersion: result.modelVersion,
          inferenceTimeMs: result.inferenceTimeMs,
          mode: result.mode,
        },
        "Inference completed successfully"
      );

      reply.status(200).send({
        caption: result.caption,
        model: result.model,
        modelVersion: result.modelVersion,
        mode: result.mode,
        inferenceTimeMs: result.inferenceTimeMs,
        requestId,
        details: result.details,
      });
    } catch (error) {
      handleInferenceError(error, request, reply);
    } finally {
      // Clean up temporary image file on both success and error paths
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch {
          // Ignore temp cleanup errors
        }
      }
    }
  }
);
}
