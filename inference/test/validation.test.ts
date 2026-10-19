import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import sharp from "sharp";
import { ImageValidationError } from "../src/model/types.js";
import { assertDecodable, detectImageType, validateImagePath } from "../src/model/validation.js";

describe("validation module", () => {
  let tmpDir: string;
  let validJpegBuffer: Buffer;
  let validPngBuffer: Buffer;
  let validWebpBuffer: Buffer;
  let validJpegPath: string;
  let validPngPath: string;
  let validWebpPath: string;
  let textAsJpgPath: string;
  let txtFilePath: string;
  let unreadablePath: string;

  before(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "img-val-test-"));

    validJpegBuffer = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .jpeg()
      .toBuffer();

    validPngBuffer = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 0, g: 255, b: 0 } },
    })
      .png()
      .toBuffer();

    validWebpBuffer = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 0, g: 0, b: 255 } },
    })
      .webp()
      .toBuffer();

    validJpegPath = path.join(tmpDir, "valid.jpg");
    fs.writeFileSync(validJpegPath, validJpegBuffer);

    validPngPath = path.join(tmpDir, "valid.png");
    fs.writeFileSync(validPngPath, validPngBuffer);

    validWebpPath = path.join(tmpDir, "valid.webp");
    fs.writeFileSync(validWebpPath, validWebpBuffer);

    textAsJpgPath = path.join(tmpDir, "fake.jpg");
    fs.writeFileSync(textAsJpgPath, "this is plain text not an image");

    txtFilePath = path.join(tmpDir, "document.txt");
    fs.writeFileSync(txtFilePath, "hello world");

    unreadablePath = path.join(tmpDir, "unreadable.jpg");
    fs.writeFileSync(unreadablePath, validJpegBuffer);
    try {
      fs.chmodSync(unreadablePath, 0o000);
    } catch {
      // Ignore if OS does not support chmod 000
    }
  });

  after(() => {
    try {
      fs.chmodSync(unreadablePath, 0o666);
    } catch {
      // Ignore
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("detectImageType", () => {
    it("identifies valid JPEG, PNG, and WebP buffers", () => {
      assert.equal(detectImageType(validJpegBuffer), "jpeg");
      assert.equal(detectImageType(validPngBuffer), "png");
      assert.equal(detectImageType(validWebpBuffer), "webp");
    });

    it("rejects WAV-like buffers starting with RIFF....WAVE", () => {
      const riffWaveBuffer = Buffer.concat([
        Buffer.from("RIFF"),
        Buffer.from([0x24, 0x00, 0x00, 0x00]),
        Buffer.from("WAVE"),
        Buffer.alloc(24),
      ]);
      assert.equal(detectImageType(riffWaveBuffer), null);
    });

    it("rejects non-image or short buffers", () => {
      assert.equal(detectImageType(Buffer.from("hi")), null);
      assert.equal(detectImageType(Buffer.from("plain text header")), null);
    });
  });

  describe("assertDecodable", () => {
    it("passes for valid JPEG, PNG, and WebP images", async () => {
      await assert.doesNotReject(() => assertDecodable(validJpegBuffer));
      await assert.doesNotReject(() => assertDecodable(validPngBuffer));
      await assert.doesNotReject(() => assertDecodable(validWebpBuffer));
    });

    it("rejects a real JPEG cut to half its length with CORRUPT_IMAGE", async () => {
      const halfJpeg = validJpegBuffer.subarray(0, Math.floor(validJpegBuffer.length / 2));
      await assert.rejects(
        () => assertDecodable(halfJpeg),
        (err: unknown) => {
          assert(err instanceof ImageValidationError);
          assert.equal(err.code, "CORRUPT_IMAGE");
          return true;
        }
      );
    });

    it("rejects a header-only 8-byte JPEG with CORRUPT_IMAGE", async () => {
      const headerOnly = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
      await assert.rejects(
        () => assertDecodable(headerOnly),
        (err: unknown) => {
          assert(err instanceof ImageValidationError);
          assert.equal(err.code, "CORRUPT_IMAGE");
          return true;
        }
      );
    });

    it("rejects a WAV-like buffer starting with RIFF....WAVE", async () => {
      const riffWaveBuffer = Buffer.concat([
        Buffer.from("RIFF"),
        Buffer.from([0x24, 0x00, 0x00, 0x00]),
        Buffer.from("WAVE"),
        Buffer.alloc(24),
      ]);
      await assert.rejects(
        () => assertDecodable(riffWaveBuffer),
        (err: unknown) => {
          assert(err instanceof ImageValidationError);
          assert.equal(err.code, "CORRUPT_IMAGE");
          return true;
        }
      );
    });

    it("rejects a 10x10 image as too small with CORRUPT_IMAGE", async () => {
      const smallBuffer = await sharp({
        create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 255, b: 255 } },
      })
        .jpeg()
        .toBuffer();

      await assert.rejects(
        () => assertDecodable(smallBuffer),
        (err: unknown) => {
          assert(err instanceof ImageValidationError);
          assert.equal(err.code, "CORRUPT_IMAGE");
          return true;
        }
      );
    });
  });

  describe("validateImagePath", () => {
    it("throws ImageValidationError if path is empty or missing", () => {
      assert.throws(() => validateImagePath(""), ImageValidationError);
      assert.throws(() => validateImagePath("   "), ImageValidationError);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assert.throws(() => validateImagePath(null as any), ImageValidationError);
    });

    it("throws ImageValidationError if file does not exist", () => {
      assert.throws(
        () => validateImagePath(path.join(tmpDir, "nonexistent.jpg")),
        ImageValidationError
      );
    });

    it("throws ImageValidationError for unsupported file extensions", () => {
      assert.throws(() => validateImagePath(txtFilePath), ImageValidationError);
    });

    it("throws ImageValidationError if file content headers do not match JPEG/PNG", () => {
      assert.throws(() => validateImagePath(textAsJpgPath), ImageValidationError);
    });

    it("returns resolved path for a valid JPEG image file", () => {
      const result = validateImagePath(validJpegPath);
      assert.equal(result, path.resolve(validJpegPath));
    });

    it("returns resolved path for a valid PNG image file", () => {
      const result = validateImagePath(validPngPath);
      assert.equal(result, path.resolve(validPngPath));
    });

    it("returns resolved path for a valid WebP image file", () => {
      const result = validateImagePath(validWebpPath);
      assert.equal(result, path.resolve(validWebpPath));
    });
  });
});
