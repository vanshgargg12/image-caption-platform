import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { ImageValidationError } from "../src/model/types.js";
import { validateImagePath } from "../src/model/validation.js";

describe("validateImagePath", () => {
  let tmpDir: string;
  let validJpegPath: string;
  let validPngPath: string;
  let textAsJpgPath: string;
  let txtFilePath: string;
  let unreadablePath: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "img-val-test-"));

    // Valid JPEG (SOI 0xFFD8FF followed by valid bytes)
    validJpegPath = path.join(tmpDir, "valid.jpg");
    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    fs.writeFileSync(validJpegPath, jpegHeader);

    // Valid PNG (89 50 4E 47 0D 0A 1A 0A)
    validPngPath = path.join(tmpDir, "valid.png");
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    fs.writeFileSync(validPngPath, pngHeader);

    // Text file renamed as .jpg (invalid magic bytes)
    textAsJpgPath = path.join(tmpDir, "fake.jpg");
    fs.writeFileSync(textAsJpgPath, "this is plain text not an image");

    // Text file with unsupported extension
    txtFilePath = path.join(tmpDir, "document.txt");
    fs.writeFileSync(txtFilePath, "hello world");

    // File with no read permissions (chmod 000)
    unreadablePath = path.join(tmpDir, "unreadable.jpg");
    fs.writeFileSync(unreadablePath, jpegHeader);
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
});
