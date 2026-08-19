package com.imagecaption.platform.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.imagecaption.platform.domain.FeedbackRating;
import com.imagecaption.platform.dto.FeedbackRequestDto;
import com.imagecaption.platform.dto.FeedbackResponseDto;
import com.imagecaption.platform.exception.CaptionNotFoundException;
import com.imagecaption.platform.exception.GlobalExceptionHandler;
import com.imagecaption.platform.service.FeedbackService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FeedbackController.class)
@Import(GlobalExceptionHandler.class)
class FeedbackControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private FeedbackService feedbackService;

    @Test
    void submitFeedback_successReturns201() throws Exception {
        UUID captionId = UUID.randomUUID();
        UUID feedbackId = UUID.randomUUID();

        FeedbackRequestDto requestDto = new FeedbackRequestDto(
                FeedbackRating.POSITIVE,
                "missing details",
                null,
                "Great overall caption"
        );

        FeedbackResponseDto responseDto = new FeedbackResponseDto(
                feedbackId,
                captionId,
                FeedbackRating.POSITIVE,
                "missing details",
                null,
                "Great overall caption",
                Instant.now()
        );

        when(feedbackService.submitFeedback(eq(captionId), any())).thenReturn(responseDto);

        mockMvc.perform(post("/api/v1/captions/{id}/feedback", captionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(feedbackId.toString()))
                .andExpect(jsonPath("$.captionRequestId").value(captionId.toString()))
                .andExpect(jsonPath("$.rating").value("POSITIVE"));
    }

    @Test
    void submitFeedback_nonExistingIdReturns404() throws Exception {
        UUID captionId = UUID.randomUUID();
        FeedbackRequestDto requestDto = new FeedbackRequestDto(FeedbackRating.NEGATIVE, null, null, null);

        when(feedbackService.submitFeedback(eq(captionId), any())).thenThrow(new CaptionNotFoundException(captionId));

        mockMvc.perform(post("/api/v1/captions/{id}/feedback", captionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CAPTION_NOT_FOUND"));
    }
}
