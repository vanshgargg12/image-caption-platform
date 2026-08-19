package com.imagecaption.platform.provider;

public record InferenceResult(
        String caption,
        String model,
        String modelVersion,
        String mode,
        long inferenceTimeMs,
        String requestId
) {
}
