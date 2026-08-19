package com.imagecaption.platform.dto;

import java.time.Instant;

public record ErrorResponseDto(
        Instant timestamp,
        String requestId,
        String code,
        String message,
        Object details
) {
}
