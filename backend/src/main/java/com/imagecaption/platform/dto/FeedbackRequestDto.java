package com.imagecaption.platform.dto;

import com.imagecaption.platform.domain.FeedbackRating;
import jakarta.validation.constraints.NotNull;

public record FeedbackRequestDto(
        @NotNull(message = "rating is required")
        FeedbackRating rating,
        String missingInformation,
        String incorrectInformation,
        String userComment
) {
}
