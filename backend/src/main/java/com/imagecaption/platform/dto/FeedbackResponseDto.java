package com.imagecaption.platform.dto;

import com.imagecaption.platform.domain.FeedbackRating;

import java.time.Instant;
import java.util.UUID;

public record FeedbackResponseDto(
        UUID id,
        UUID captionRequestId,
        FeedbackRating rating,
        String missingInformation,
        String incorrectInformation,
        String userComment,
        Instant createdAt
) {
}
