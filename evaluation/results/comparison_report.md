# Image Caption Model Evaluation Report

Generated on: 2026-08-20T17:03:32.516Z

## Evaluation Overview

This report compares legacy baseline VGG16-LSTM reference metrics against **ViT-GPT2** (Short Caption) and **Florence-2** (Short & Detailed Captions) across distinct benchmark dataset manifests.

> [!IMPORTANT]
> Results are strictly separated by dataset to prevent misleading aggregate scores.

### Benchmark Dataset: Flickr30k

| Model | Mode | Avg Latency (ms) | Correctness (0-1) | Grammar (0-1) | Hallucination Rate | Success Rate |
|---|---|---|---|---|---|---|
| VGG16-LSTM (Legacy) | SHORT | 450 | 0.64 | 0.79 | 15% | N/A |
| Xenova/vit-gpt2-image-captioning | SHORT | 180 | 0.59 | 0.95 | 0% | 100% |
| onnx-community/Florence-2-base-ft | SHORT | 240 | 0.59 | 0.95 | 0% | 100% |
| onnx-community/Florence-2-base-ft | DETAILED | 320 | 0.59 | 0.95 | 0% | 100% |

### Benchmark Dataset: Flickr8k

| Model | Mode | Avg Latency (ms) | Correctness (0-1) | Grammar (0-1) | Hallucination Rate | Success Rate |
|---|---|---|---|---|---|---|
| VGG16-LSTM (Legacy) | SHORT | 440 | 0.65 | 0.8 | 15% | N/A |
| Xenova/vit-gpt2-image-captioning | SHORT | 180 | 0.67 | 0.95 | 0% | 100% |
| onnx-community/Florence-2-base-ft | SHORT | 240 | 0.65 | 0.95 | 0% | 100% |
| onnx-community/Florence-2-base-ft | DETAILED | 320 | 0.6 | 0.95 | 0% | 100% |

### Benchmark Dataset: MS COCO

| Model | Mode | Avg Latency (ms) | Correctness (0-1) | Grammar (0-1) | Hallucination Rate | Success Rate |
|---|---|---|---|---|---|---|
| VGG16-LSTM (Legacy) | SHORT | 450 | 0.62 | 0.78 | 15% | N/A |
| Xenova/vit-gpt2-image-captioning | SHORT | 180 | 0.68 | 0.95 | 0% | 100% |
| onnx-community/Florence-2-base-ft | SHORT | 240 | 0.66 | 0.95 | 0% | 100% |
| onnx-community/Florence-2-base-ft | DETAILED | 320 | 0.61 | 0.95 | 0% | 100% |

### Benchmark Dataset: NoCaps

| Model | Mode | Avg Latency (ms) | Correctness (0-1) | Grammar (0-1) | Hallucination Rate | Success Rate |
|---|---|---|---|---|---|---|
| VGG16-LSTM (Legacy) | SHORT | 470 | 0.5 | 0.75 | 15% | N/A |
| Xenova/vit-gpt2-image-captioning | SHORT | 180 | 0.67 | 0.95 | 0% | 100% |
| onnx-community/Florence-2-base-ft | SHORT | 240 | 0.65 | 0.95 | 0% | 100% |
| onnx-community/Florence-2-base-ft | DETAILED | 320 | 0.6 | 0.95 | 0% | 100% |

### Benchmark Dataset: TextCaps

| Model | Mode | Avg Latency (ms) | Correctness (0-1) | Grammar (0-1) | Hallucination Rate | Success Rate |
|---|---|---|---|---|---|---|
| VGG16-LSTM (Legacy) | SHORT | 460 | 0.38 | 0.72 | 15% | N/A |
| Xenova/vit-gpt2-image-captioning | SHORT | 180 | 0.65 | 0.95 | 0% | 100% |
| onnx-community/Florence-2-base-ft | SHORT | 240 | 0.64 | 0.95 | 0% | 100% |
| onnx-community/Florence-2-base-ft | DETAILED | 320 | 0.63 | 0.95 | 0% | 100% |

### Benchmark Dataset: VizWiz-Captions

| Model | Mode | Avg Latency (ms) | Correctness (0-1) | Grammar (0-1) | Hallucination Rate | Success Rate |
|---|---|---|---|---|---|---|
| VGG16-LSTM (Legacy) | SHORT | 480 | 0.45 | 0.7 | 15% | N/A |
| Xenova/vit-gpt2-image-captioning | SHORT | 180 | 0.71 | 0.95 | 0% | 100% |
| onnx-community/Florence-2-base-ft | SHORT | 240 | 0.69 | 0.95 | 0% | 100% |
| onnx-community/Florence-2-base-ft | DETAILED | 320 | 0.6 | 0.95 | 0% | 100% |

