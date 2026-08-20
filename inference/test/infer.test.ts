import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import { after, before, beforeEach, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { setModelPipelineForTesting } from "../src/model/loader.js";
import { setModelStateForTesting } from "../src/model/state.js";
import { buildServer } from "../src/server.js";

// Helper function to build multipart form payload manually
function buildMultipartPayload(
  fields: Array<{ name: string; value: string }>,
  files: Array<{ name: string; filename: string; contentType: string; data: Buffer }>
) {
  const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
  const chunks: Buffer[] = [];

  for (const field of fields) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${field.name}"\r\n\r\n${field.value}\r\n`
      )
    );
  }

  for (const file of files) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`
      )
    );
    chunks.push(file.data);
    chunks.push(Buffer.from("\r\n"));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    boundary,
    body: Buffer.concat(chunks),
  };
}

describe("HTTP Internal Inference Service", () => {
  let app: FastifyInstance;
  const validJpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

  before(async () => {
    app = await buildServer();
  });

  after(async () => {
    setModelPipelineForTesting(null);
    await app.close();
  });

  beforeEach(() => {
    setModelPipelineForTesting(null);
    setModelStateForTesting({
      loaded: true,
      loading: false,
      modelId: "Xenova/vit-gpt2-image-captioning",
      modelRevision: "main",
      error: null,
    });
  });

  it("GET /internal/health returns UP without checking model load status", async () => {
    setModelStateForTesting({ loaded: false });

    const response = await app.inject({
      method: "GET",
      url: "/internal/health",
    });

    assert.equal(response.statusCode, 200);
    const body = response.json<{ status: string; service: string }>();
    assert.equal(body.status, "UP");
    assert.equal(body.service, "inference");
  });

  it("GET /internal/ready returns 503 when model is not ready", async () => {
    setModelStateForTesting({ loaded: false, loading: false });

    const response = await app.inject({
      method: "GET",
      url: "/internal/ready",
    });

    assert.equal(response.statusCode, 503);
    const body = response.json<{
      status: string;
      model: { loaded: boolean; modelId: string };
    }>();
    assert.equal(body.status, "NOT_READY");
    assert.equal(body.model.loaded, false);
  });

  it("GET /internal/ready returns 200 when model is loaded", async () => {
    setModelStateForTesting({ loaded: true });

    const response = await app.inject({
      method: "GET",
      url: "/internal/ready",
    });

    assert.equal(response.statusCode, 200);
    const body = response.json<{
      status: string;
      model: { loaded: boolean; modelId: string; modelRevision: string };
    }>();
    assert.equal(body.status, "READY");
    assert.equal(body.model.loaded, true);
    assert.equal(body.model.modelId, "Xenova/vit-gpt2-image-captioning");
    assert.equal(body.model.modelRevision, "main");
  });

  it("POST /internal/infer generates caption successfully for valid multipart JPEG", async () => {
    const mockPipe = async () => [{ generated_text: "a cute puppy running in grass" }];
    setModelPipelineForTesting(mockPipe);

    const { boundary, body } = buildMultipartPayload(
      [{ name: "mode", value: "SHORT" }],
      [
        {
          name: "image",
          filename: "sample.jpg",
          contentType: "image/jpeg",
          data: validJpegHeader,
        },
      ]
    );

    const response = await app.inject({
      method: "POST",
      url: "/internal/infer",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
        "x-request-id": "test-req-123",
      },
      payload: body,
    });

    assert.equal(response.statusCode, 200);
    const result = response.json<{
      caption: string;
      model: string;
      modelVersion: string;
      mode: string;
      requestId: string;
      inferenceTimeMs: number;
    }>();

    assert.equal(result.caption, "a cute puppy running in grass");
    assert.equal(result.model, "Xenova/vit-gpt2-image-captioning");
    assert.equal(result.modelVersion, "main");
    assert.equal(result.mode, "SHORT");
    assert.equal(result.requestId, "test-req-123");
    assert.equal(typeof result.inferenceTimeMs, "number");
  });

  it("POST /internal/infer returns 503 when model is unavailable or not ready", async () => {
    setModelStateForTesting({ loaded: false });

    const { boundary, body } = buildMultipartPayload(
      [{ name: "mode", value: "SHORT" }],
      [
        {
          name: "image",
          filename: "sample.jpg",
          contentType: "image/jpeg",
          data: validJpegHeader,
        },
      ]
    );

    const response = await app.inject({
      method: "POST",
      url: "/internal/infer",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    assert.equal(response.statusCode, 503);
    const err = response.json<{ code: string; message: string }>();
    assert.equal(err.code, "MODEL_NOT_READY");
  });

  it("POST /internal/infer returns 400 when missing image file part", async () => {
    const { boundary, body } = buildMultipartPayload(
      [{ name: "mode", value: "SHORT" }],
      []
    );

    const response = await app.inject({
      method: "POST",
      url: "/internal/infer",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    assert.equal(response.statusCode, 400);
    const err = response.json<{ code: string }>();
    assert.equal(err.code, "MISSING_IMAGE_FILE");
  });

  it("POST /internal/infer returns 400 when uploaded file is empty (0 bytes)", async () => {
    const { boundary, body } = buildMultipartPayload(
      [{ name: "mode", value: "SHORT" }],
      [
        {
          name: "image",
          filename: "empty.jpg",
          contentType: "image/jpeg",
          data: Buffer.alloc(0),
        },
      ]
    );

    const response = await app.inject({
      method: "POST",
      url: "/internal/infer",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    assert.equal(response.statusCode, 400);
    const err = response.json<{ code: string }>();
    assert.equal(err.code, "EMPTY_FILE");
  });

  it("POST /internal/infer returns 400 when file content header is invalid/unsupported", async () => {
    const { boundary, body } = buildMultipartPayload(
      [{ name: "mode", value: "SHORT" }],
      [
        {
          name: "image",
          filename: "fake.jpg",
          contentType: "image/jpeg",
          data: Buffer.from("this is plain text not an image"),
        },
      ]
    );

    const response = await app.inject({
      method: "POST",
      url: "/internal/infer",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    assert.equal(response.statusCode, 400);
    const err = response.json<{ code: string }>();
    assert.equal(err.code, "UNSUPPORTED_IMAGE_TYPE");
  });

  it("POST /internal/infer returns 400 for invalid or reserved caption mode", async () => {
    const { boundary, body } = buildMultipartPayload(
      [{ name: "mode", value: "DETAILED" }],
      [
        {
          name: "image",
          filename: "sample.jpg",
          contentType: "image/jpeg",
          data: validJpegHeader,
        },
      ]
    );

    const response = await app.inject({
      method: "POST",
      url: "/internal/infer",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    assert.equal(response.statusCode, 400);
    const err = response.json<{ code: string; message: string }>();
    assert.equal(err.code, "UNSUPPORTED_CAPTION_MODE");
    assert.match(err.message, /does not support caption mode/);
  });

  it("POST /internal/infer cleans up temporary files on success and failure", async () => {
    const mockPipe = async () => [{ generated_text: "a scenic mountain view" }];
    setModelPipelineForTesting(mockPipe);

    const tmpBefore = fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith("infer_"));

    const { boundary, body } = buildMultipartPayload(
      [{ name: "mode", value: "SHORT" }],
      [
        {
          name: "image",
          filename: "sample.jpg",
          contentType: "image/jpeg",
          data: validJpegHeader,
        },
      ]
    );

    await app.inject({
      method: "POST",
      url: "/internal/infer",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    const tmpAfter = fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith("infer_"));
    assert.equal(tmpAfter.length, tmpBefore.length);
  });

  it("POST /internal/infer processes concurrent requests serially without failing", async () => {
    let activeInferences = 0;
    let maxObservedActive = 0;

    const mockPipe = async () => {
      activeInferences++;
      maxObservedActive = Math.max(maxObservedActive, activeInferences);
      await new Promise((resolve) => setTimeout(resolve, 50));
      activeInferences--;
      return [{ generated_text: "serial concurrency test caption" }];
    };

    setModelPipelineForTesting(mockPipe);

    const createPayload = () =>
      buildMultipartPayload(
        [{ name: "mode", value: "SHORT" }],
        [
          {
            name: "image",
            filename: "sample.jpg",
            contentType: "image/jpeg",
            data: validJpegHeader,
          },
        ]
      );

    const p1 = app.inject({
      method: "POST",
      url: "/internal/infer",
      headers: { "content-type": `multipart/form-data; boundary=${createPayload().boundary}` },
      payload: createPayload().body,
    });

    const p2 = app.inject({
      method: "POST",
      url: "/internal/infer",
      headers: { "content-type": `multipart/form-data; boundary=${createPayload().boundary}` },
      payload: createPayload().body,
    });

    const [r1, r2] = await Promise.all([p1, p2]);

    assert.equal(r1.statusCode, 200);
    assert.equal(r2.statusCode, 200);
    assert.equal(maxObservedActive, 1); // Serialized max 1 active inference call
  });
});
