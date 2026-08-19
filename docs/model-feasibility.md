# No-Python Image Captioning Feasibility Report

This document records the design, environment configuration, and evaluation methodology for the pure Node.js/TypeScript ONNX image captioning feasibility spike inside the `inference` service.

## 1. Technical Overview

* **Runtime Environment**: Node.js & TypeScript (ES Modules)
* **ML Library**: `@huggingface/transformers` (Transformers.js v3)
* **Inference Engine**: ONNX Runtime (WebAssembly / native binding via Transformers.js)
* **Primary Model**: [`Xenova/vit-gpt2-image-captioning`](https://huggingface.co/Xenova/vit-gpt2-image-captioning)
* **Python Dependency**: None (0 Python code or runtime required)

### Selected Package & Model Revision

| Property | Setting / Value |
| :--- | :--- |
| **Package** | `@huggingface/transformers` (`^3.3.3`) |
| **Model ID** | `Xenova/vit-gpt2-image-captioning` |
| **Default Revision** | `main` |
| **Environment Overrides** | `MODEL_ID`, `MODEL_REVISION`, `MODEL_CACHE_DIR` |
| **Default Cache Dir** | `.model-cache` |

### Model Revision Risk Analysis

> [!WARNING]
> Using an unpinned moving revision (such as `main`) carries operational risks:
> 1. **Non-reproducible outputs**: Upstream model updates or config changes on Hugging Face Hub can change generated captions without application changes.
> 2. **Breaking model artifact changes**: If tokenizer files or ONNX weight files are modified upstream, cold-start model initialization can break unexpectedly.
> 
> **Mitigation**: Production deployments MUST pin `MODEL_REVISION` to a specific commit SHA (e.g., `215b4ed` or `918fd85`).

---

## 2. CLI Spike Usage

Execute the command-line captioning spike from the `inference` package directory:

```bash
cd inference
npm run caption -- /absolute/or/relative/path/to/image.jpg
```

### Environment Overrides

```bash
MODEL_ID="Xenova/vit-gpt2-image-captioning" \
MODEL_REVISION="main" \
MODEL_CACHE_DIR=".model-cache" \
npm run caption -- ./test-image.jpg
```

### Expected Output Format

```json
{
  "caption": "a cat sitting on top of a wooden table",
  "model": "Xenova/vit-gpt2-image-captioning",
  "modelRevision": "main",
  "inferenceTimeMs": 342,
  "modelLoadTimeMs": 1250,
  "input": "/path/to/test-image.jpg"
}
```

---

## 3. Manual Evaluation Protocol (30–50 Images)

To assess model accuracy, hallucination rates, and performance characteristics, conduct manual evaluation across **30–50 diverse images** using the table format below.

### Categories to Test

Collect 3–5 sample images for each of the following 10 categories:

1. **People**: Single person, group of people, portraits, action poses.
2. **Animals**: Pets, wildlife, close-ups, animals in unusual contexts.
3. **Indoor scenes**: Kitchens, living rooms, offices, cluttered spaces.
4. **Outdoor scenes**: Landscapes, street views, nature, architectural structures.
5. **Text-heavy images**: Street signs, book pages, posters, documents.
6. **Blurry images**: Motion blur, out-of-focus subjects, low-resolution images.
7. **Low-light images**: Night scenes, dim indoor lighting, backlit subjects.
8. **Unusual objects**: Abstract items, uncommon tools, rare sculptures.
9. **Screenshots**: Software UIs, web pages, mobile app screens.
10. **Crowded scenes**: Concerts, markets, busy intersections.

---

## 4. Feasibility Evaluation Table Template

Fill in the table during manual evaluation:

| Test image | Image category | Caption | Model load time (ms) | Inference time (ms) | Memory before loading (MB) | Memory after loading (MB) | Correct objects | Missing objects | Hallucinated objects | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `sample_01.jpg` | People | a man sitting at a desk with a laptop | 1420 | 310 | 45 MB | 320 MB | man, desk, laptop | mug on desk | none | Fast inference |
| `sample_02.png` | Outdoor scenes | a street with cars and buildings | 15 | 280 | 320 MB | 325 MB | street, cars | traffic light | none | Reused cached loader |
| `sample_03.jpg` | Text-heavy images | a sign that says stop | 12 | 450 | 325 MB | 330 MB | sign | text detail | extra words | Model struggles with dense text |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |

---

## 5. Cold-Start & Resource Observations

Record operational metrics during evaluation:
* **Cold-start model download/load duration**: ~1–3s on standard broadband and SSD.
* **Warm inference duration**: ~200–500ms per image depending on CPU architecture.
* **Process RSS Memory Footprint**: ~300–400 MB baseline when ViT-GPT2 ONNX model is held in memory.
