package com.imagecaption.platform.integration;

import com.imagecaption.platform.domain.CaptionMode;
import com.imagecaption.platform.domain.CaptionRequestEntity;
import com.imagecaption.platform.domain.CaptionStatus;
import com.imagecaption.platform.domain.FeedbackEntity;
import com.imagecaption.platform.domain.FeedbackRating;
import com.imagecaption.platform.repository.CaptionRequestRepository;
import com.imagecaption.platform.repository.FeedbackRepository;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Assumptions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
@TestPropertySource(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.flyway.enabled=true"
})
class PostgresIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @BeforeAll
    static void checkDocker() {
        Assumptions.assumeTrue(DockerClientFactory.instance().isDockerAvailable(), "Docker daemon is not running. Skipping Testcontainers test.");
    }

    @Autowired
    private CaptionRequestRepository captionRequestRepository;

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Test
    void verifyPostgresFlywayMigrationsAndPersistence() {
        UUID captionId = UUID.randomUUID();
        CaptionRequestEntity entity = new CaptionRequestEntity(
                captionId,
                CaptionStatus.COMPLETED,
                "postgres-test.jpg",
                "sha256hash",
                CaptionMode.SHORT,
                "Xenova/vit-gpt2-image-captioning",
                "main",
                Instant.now()
        );
        entity.setGeneratedCaption("a test caption in postgres");
        captionRequestRepository.save(entity);

        CaptionRequestEntity retrieved = captionRequestRepository.findById(captionId).orElse(null);
        assertNotNull(retrieved);
        assertEquals("a test caption in postgres", retrieved.getGeneratedCaption());
        assertEquals(CaptionStatus.COMPLETED, retrieved.getStatus());

        UUID feedbackId = UUID.randomUUID();
        FeedbackEntity feedback = new FeedbackEntity(
                feedbackId,
                captionId,
                FeedbackRating.POSITIVE,
                "all details clear",
                null,
                "Verified on PostgreSQL",
                Instant.now()
        );
        feedbackRepository.save(feedback);

        List<FeedbackEntity> feedbacks = feedbackRepository.findByCaptionRequestId(captionId);
        assertFalse(feedbacks.isEmpty());
        assertEquals(1, feedbacks.size());
        assertEquals(FeedbackRating.POSITIVE, feedbacks.get(0).getRating());
    }
}
