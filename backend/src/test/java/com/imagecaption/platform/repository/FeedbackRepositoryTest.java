package com.imagecaption.platform.repository;

import com.imagecaption.platform.domain.CaptionMode;
import com.imagecaption.platform.domain.CaptionRequestEntity;
import com.imagecaption.platform.domain.CaptionStatus;
import com.imagecaption.platform.domain.FeedbackEntity;
import com.imagecaption.platform.domain.FeedbackRating;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.TestPropertySource;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

@DataJpaTest
@TestPropertySource(locations = "classpath:application-test.properties")
class FeedbackRepositoryTest {

    @Autowired
    private CaptionRequestRepository captionRequestRepository;

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Test
    void saveAndFindByCaptionRequestId_success() {
        UUID captionId = UUID.randomUUID();
        CaptionRequestEntity captionEntity = new CaptionRequestEntity(
                captionId, CaptionStatus.COMPLETED, "dog.jpg", "hash123", CaptionMode.SHORT,
                "model", "version", Instant.now()
        );
        captionRequestRepository.save(captionEntity);

        UUID feedbackId = UUID.randomUUID();
        FeedbackEntity feedbackEntity = new FeedbackEntity(
                feedbackId, captionId, FeedbackRating.POSITIVE, "missing details", null, "Good!", Instant.now()
        );
        feedbackRepository.save(feedbackEntity);

        List<FeedbackEntity> list = feedbackRepository.findByCaptionRequestId(captionId);
        assertFalse(list.isEmpty());
        assertEquals(1, list.size());
        assertEquals(FeedbackRating.POSITIVE, list.get(0).getRating());
    }
}
