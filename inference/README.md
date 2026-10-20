# Inference Service

Internal Node.js service providing ONNX-based image captioning via `@huggingface/transformers` without Python dependencies.

> [!WARNING]
> **Security Notice**: This service is strictly **internal-only** (designed to run behind the Spring Boot backend or internal container network). It MUST NOT be exposed directly to the public internet.

---

## Supported Models and Modes

The inference service provides a unified provider abstraction (`CaptionModel`) supporting multiple ONNX vision-language architectures:

| Model ID | Provider | Supported Modes | Description |
|---|---|---|---|
| `Xenova/vit-gpt2-image-captioning` | `VitGpt2CaptionModel` | `SHORT` | Fast, lightweight vision-encoder-decoder trained on COCO captions. |
| `onnx-community/Florence-2-base-ft` | `Florence2CaptionModel` | `SHORT`, `DETAILED`, `OCR` | Advanced foundation model capable of task-prompted detailed captions and text extraction. |

### Florence-2 Architecture & Generation Flow

Unlike ViT-GPT2 which uses the standard `pipeline("image-to-text")`, Florence-2 is an `image-text-to-text` model requiring explicit task prompts. It directly utilizes library classes from `@huggingface/transformers`:
- `Florence2ForConditionalGeneration`: The multi-modal ONNX model instance (vision encoder + language decoder).
- `AutoProcessor`: Multi-modal processor handling image preprocessing, task prompt injection (`construct_prompts`), and output parsing (`post_process_generation`).
- `AutoTokenizer`: Decodes generated token IDs into text.
- `RawImage`: Library image representation and dimensions loader.

#### Inference Execution Flow
1. **Load image**: `image = await RawImage.read(path)`
2. **Vision preprocessing**: `visionInputs = await processor(image)`
3. **Task prompting & tokenization**: `prompts = processor.construct_prompts(task); textInputs = tokenizer(prompts)`
   - `SHORT` maps to `<CAPTION>`
   - `DETAILED` maps to `<MORE_DETAILED_CAPTION>`
   - `OCR` maps to `<OCR>`
4. **Generation**: `ids = await model.generate({ ...textInputs, ...visionInputs, max_new_tokens, num_beams })`
5. **Decoding**: `text = tokenizer.batch_decode(ids, { skip_special_tokens: false })[0]`
6. **Task post-processing**: `result = processor.post_process_generation(text, task, image.size); caption = result[task]`
7. **Caption cleanup**: Raw task prompt tokens and special tags are stripped, and output is normalized using `cleanCaption()`.

---

## HTTP Endpoints

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/internal/health` | Liveness check (returns 200 OK process running; does not require model to be loaded) | Internal |
| `GET` | `/internal/ready` | Readiness check (returns 200 OK when model loaded; 503 Service Unavailable when loading or failed) | Internal |
| `POST` | `/internal/infer` | Perform image captioning (accepts `multipart/form-data`) | Internal |

---

## API Specifications

### `POST /internal/infer`

#### Request Format
* `Content-Type`: `multipart/form-data`
* **Parts**:
  - `image` (file, required): JPEG (`.jpg`, `.jpeg`) or PNG (`.png`) file up to `MAX_IMAGE_SIZE_BYTES` (default 10 MB).
  - `mode` (text field, optional): Captioning mode. Supported MVP mode: `SHORT` (default). Reserved for future phases: `DETAILED`, `OCR`, `OBJECT_DETECTION`.

#### Successful Response (200 OK)

```json
{
  "caption": "a dog running across a green grassy field",
  "model": "Xenova/vit-gpt2-image-captioning",
  "modelVersion": "main",
  "mode": "SHORT",
  "inferenceTimeMs": 340,
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Error Response Format (4xx / 5xx)

```json
{
  "timestamp": "2026-08-19T20:00:00.000Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "code": "UNSUPPORTED_IMAGE_TYPE",
  "message": "File headers do not match a valid JPEG or PNG image.",
  "details": null
}
```

#### Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `MISSING_IMAGE_FILE` | 400 | No `image` file part was present in the multipart request |
| `EMPTY_FILE` | 400 | Uploaded image file was 0 bytes |
| `UNSUPPORTED_IMAGE_TYPE` | 400 | File headers/extension do not match JPEG or PNG |
| `INVALID_CAPTION_MODE` | 400 | Requested mode is unknown or reserved |
| `PAYLOAD_TOO_LARGE` | 413 | Uploaded image exceeds max file size |
| `MODEL_NOT_READY` | 503 | Model is still loading or failed to load |
| `SERVICE_BUSY` | 503 | Maximum concurrent inference requests exceeded |
| `INFERENCE_TIMEOUT` | 504 | Inference request timed out |

---

## Concurrency & Resource Management

* **Concurrency**: Limited to **1 concurrent inference request** to avoid CPU & RAM exhaustion. Additional incoming requests are queued up to maximum queue capacity.
* **Temporary Storage**: Uploaded multipart images are written to temporary disk locations during execution and strictly cleaned up in a `finally` block on both success and error paths.
* **Timeouts**: Inference execution is bound by `INFERENCE_TIMEOUT_MS` (default 30 seconds).

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `INFERENCE_PORT` | `3001` | Server listening port |
| `MODEL_ID` | `Xenova/vit-gpt2-image-captioning` | Hugging Face model repository ID |
| `MODEL_REVISION` | `main` | Pinned model revision / commit SHA |
| `MODEL_CACHE_DIR` | `.model-cache` | Local directory for storing ONNX model weights |
| `MAX_IMAGE_SIZE_BYTES` | `10485760` | Max upload size in bytes (10MB) |
| `INFERENCE_TIMEOUT_MS` | `30000` | Inference timeout in milliseconds |
| `MAX_CONCURRENT_INFERENCE` | `1` | Max concurrent inference execution tasks |
| `CAPTION_MAX_NEW_TOKENS` | `24` | Maximum new tokens to generate during caption inference (ViT-GPT2) |
| `CAPTION_NUM_BEAMS` | `4` | Number of beams for beam search decoding (ViT-GPT2) |
| `CAPTION_NO_REPEAT_NGRAM` | `3` | N-gram size to prevent repeated token sequences (ViT-GPT2) |
| `CAPTION_REPETITION_PENALTY` | `1.0` | Repetition penalty factor for generation (ViT-GPT2) |
| `FLORENCE2_MAX_NEW_TOKENS_SHORT` | `40` | Default maximum new tokens for Florence-2 in `SHORT` mode |
| `FLORENCE2_MAX_NEW_TOKENS_DETAILED` | `120` | Default maximum new tokens for Florence-2 in `DETAILED` mode |
| `FLORENCE2_NUM_BEAMS` | `3` | Default number of beams for Florence-2 generation |

---

## Development Commands

```bash
npm install
npm run dev        # Run server with live reload
npm run caption -- /path/to/image.jpg # CLI captioning spike
npm run lint       # Run ESLint
npm test           # Run unit and integration tests (mocked model)
npm run build      # Compile TypeScript build
npm start          # Run compiled production server
```
