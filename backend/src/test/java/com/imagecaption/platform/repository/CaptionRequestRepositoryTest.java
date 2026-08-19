package com.imagecaption.platform.repository;

import com.imagecaption.platform.domain.CaptionMode;
import com.imagecaption.platform.domain.CaptionRequestEntity;
import com.imagecaption.platform.domain.CaptionStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.TestPropertySource;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest
@TestPropertySource(locations = "classpath:application-test.properties")
class CaptionRequestRepositoryTest {

    @Autowired
    private CaptionRequestRepository repository;

    @Test
    void saveAndFindById_success() {
        UUID id = UUID.randomUUID();
        CaptionRequestEntity entity = new CaptionRequestEntity(
                id,
                CaptionStatus.PENDING,
                "photo.jpg",
                "hash123",
                CaptionMode.SHORT,
                "Xenova/vit-gpt2-image-captioning",
                "main",
                Instant.now()
        );

        repository.save(entity);

        Optional<CaptionRequestEntity> found = repository.findById(id);
        assertTrue(found.isPresent());
        assertEquals(CaptionStatus.PENDING, found.get().getStatus());
        assertEquals("photo.jpg", found.get().getOriginalFilename());
    }
}
