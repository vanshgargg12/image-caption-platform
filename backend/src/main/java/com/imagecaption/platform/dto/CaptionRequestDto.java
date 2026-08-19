package com.imagecaption.platform.dto;

import com.imagecaption.platform.domain.CaptionMode;
import com.imagecaption.platform.domain.CaptionStatus;

import java.time.Instant;
import java.util.UUID;

public record CaptionRequestDto(
        UUID id,
        CaptionStatus status,
        String originalFilename,
        String imageHash,
        CaptionMode captionMode,
        String modelName,
        String modelVersion,
        String generatedCaption,
        String editedCaption,
        Long inferenceTimeMs,
        Instant createdAt,
        Instant completedAt,
        String errorCode
) {
}
