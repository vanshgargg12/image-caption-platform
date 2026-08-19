package com.imagecaption.platform.api;

import com.imagecaption.platform.dto.FeedbackRequestDto;
import com.imagecaption.platform.dto.FeedbackResponseDto;
import com.imagecaption.platform.service.FeedbackService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/captions")
@Tag(name = "Feedback API", description = "Endpoints for submitting user ratings and feedback on generated captions")
public class FeedbackController {

    private final FeedbackService feedbackService;

    public FeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @PostMapping("/{id}/feedback")
    @Operation(summary = "Submit feedback for a caption request", description = "Records user rating (POSITIVE/NEGATIVE) and optional feedback comments.")
    public ResponseEntity<FeedbackResponseDto> submitFeedback(
            @Parameter(description = "UUID identifier of caption request", required = true)
            @PathVariable("id") UUID id,
            @Valid @RequestBody FeedbackRequestDto dto) {

        FeedbackResponseDto response = feedbackService.submitFeedback(id, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
