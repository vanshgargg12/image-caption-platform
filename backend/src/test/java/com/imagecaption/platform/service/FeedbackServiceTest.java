package com.imagecaption.platform.service;

import com.imagecaption.platform.domain.FeedbackEntity;
import com.imagecaption.platform.domain.FeedbackRating;
import com.imagecaption.platform.dto.FeedbackRequestDto;
import com.imagecaption.platform.dto.FeedbackResponseDto;
import com.imagecaption.platform.exception.CaptionNotFoundException;
import com.imagecaption.platform.repository.CaptionRequestRepository;
import com.imagecaption.platform.repository.FeedbackRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeedbackServiceTest {

    @Mock
    private CaptionRequestRepository captionRequestRepository;

    @Mock
    private FeedbackRepository feedbackRepository;

    @InjectMocks
    private FeedbackService feedbackService;

    @Test
    void submitFeedback_success() {
        UUID captionId = UUID.randomUUID();
        FeedbackRequestDto requestDto = new FeedbackRequestDto(
                FeedbackRating.POSITIVE,
                "missing cat",
                null,
                "Great caption!"
        );

        when(captionRequestRepository.existsById(captionId)).thenReturn(true);
        when(feedbackRepository.save(any(FeedbackEntity.class))).thenAnswer(i -> i.getArgument(0));

        FeedbackResponseDto response = feedbackService.submitFeedback(captionId, requestDto);

        assertNotNull(response);
        assertEquals(captionId, response.captionRequestId());
        assertEquals(FeedbackRating.POSITIVE, response.rating());
        assertEquals("missing cat", response.missingInformation());
        assertEquals("Great caption!", response.userComment());

        verify(feedbackRepository).save(any(FeedbackEntity.class));
    }

    @Test
    void submitFeedback_nonExistingCaptionIdThrowsException() {
        UUID captionId = UUID.randomUUID();
        FeedbackRequestDto requestDto = new FeedbackRequestDto(FeedbackRating.NEGATIVE, null, null, null);

        when(captionRequestRepository.existsById(captionId)).thenReturn(false);

        assertThrows(CaptionNotFoundException.class, () -> feedbackService.submitFeedback(captionId, requestDto));
    }
}
