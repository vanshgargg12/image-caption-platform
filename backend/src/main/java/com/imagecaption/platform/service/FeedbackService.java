package com.imagecaption.platform.service;

import com.imagecaption.platform.domain.FeedbackEntity;
import com.imagecaption.platform.dto.FeedbackRequestDto;
import com.imagecaption.platform.dto.FeedbackResponseDto;
import com.imagecaption.platform.exception.CaptionNotFoundException;
import com.imagecaption.platform.repository.CaptionRequestRepository;
import com.imagecaption.platform.repository.FeedbackRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class FeedbackService {

    private final CaptionRequestRepository captionRequestRepository;
    private final FeedbackRepository feedbackRepository;

    public FeedbackService(CaptionRequestRepository captionRequestRepository, FeedbackRepository feedbackRepository) {
        this.captionRequestRepository = captionRequestRepository;
        this.feedbackRepository = feedbackRepository;
    }

    @Transactional
    public FeedbackResponseDto submitFeedback(UUID captionRequestId, FeedbackRequestDto dto) {
        if (!captionRequestRepository.existsById(captionRequestId)) {
            throw new CaptionNotFoundException(captionRequestId);
        }

        UUID feedbackId = UUID.randomUUID();
        Instant createdAt = Instant.now();

        FeedbackEntity entity = new FeedbackEntity(
                feedbackId,
                captionRequestId,
                dto.rating(),
                dto.missingInformation(),
                dto.incorrectInformation(),
                dto.userComment(),
                createdAt
        );

        feedbackRepository.save(entity);

        return new FeedbackResponseDto(
                entity.getId(),
                entity.getCaptionRequestId(),
                entity.getRating(),
                entity.getMissingInformation(),
                entity.getIncorrectInformation(),
                entity.getUserComment(),
                entity.getCreatedAt()
        );
    }
}
