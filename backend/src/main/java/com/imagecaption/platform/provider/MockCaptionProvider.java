package com.imagecaption.platform.provider;

import com.imagecaption.platform.domain.CaptionMode;
import com.imagecaption.platform.exception.InferenceServiceException;
import com.imagecaption.platform.exception.InvalidImageException;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.io.File;
import java.util.UUID;

@Component
@Profile("test")
public class MockCaptionProvider implements CaptionProvider {

    private boolean simulateFailure = false;
    private boolean simulateTimeout = false;
    private boolean simulateInvalidImage = false;
    private String mockCaption = "a mock generated caption of an image";
    private String modelName = "Xenova/vit-gpt2-image-captioning";
    private String modelVersion = "main";
    private long mockInferenceTimeMs = 120L;

    public MockCaptionProvider() {
    }

    public MockCaptionProvider(String mockCaption) {
        this.mockCaption = mockCaption;
    }

    @Override
    public InferenceResult generateCaption(File imageFile, CaptionMode mode) {
        if (simulateInvalidImage) {
            throw new InvalidImageException("File headers do not match a valid JPEG or PNG image.", "UNSUPPORTED_IMAGE_TYPE");
        }
        if (simulateTimeout) {
            throw new InferenceServiceException("Inference request timed out", "INFERENCE_TIMEOUT", 504);
        }
        if (simulateFailure) {
            throw new InferenceServiceException("Inference service unavailable", "INFERENCE_SERVICE_UNAVAILABLE", 503);
        }

        return new InferenceResult(
                mockCaption,
                modelName,
                modelVersion,
                mode.name(),
                mockInferenceTimeMs,
                UUID.randomUUID().toString()
        );
    }

    public void setSimulateFailure(boolean simulateFailure) {
        this.simulateFailure = simulateFailure;
    }

    public void setSimulateTimeout(boolean simulateTimeout) {
        this.simulateTimeout = simulateTimeout;
    }

    public void setSimulateInvalidImage(boolean simulateInvalidImage) {
        this.simulateInvalidImage = simulateInvalidImage;
    }

    public void setMockCaption(String mockCaption) {
        this.mockCaption = mockCaption;
    }

    public void setModelName(String modelName) {
        this.modelName = modelName;
    }

    public void setModelVersion(String modelVersion) {
        this.modelVersion = modelVersion;
    }

    public void setMockInferenceTimeMs(long mockInferenceTimeMs) {
        this.mockInferenceTimeMs = mockInferenceTimeMs;
    }
}
