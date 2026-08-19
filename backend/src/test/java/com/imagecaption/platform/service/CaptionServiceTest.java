package com.imagecaption.platform.service;

import com.imagecaption.platform.domain.CaptionMode;
import com.imagecaption.platform.domain.CaptionRequestEntity;
import com.imagecaption.platform.domain.CaptionStatus;
import com.imagecaption.platform.dto.CaptionRequestDto;
import com.imagecaption.platform.exception.CaptionNotFoundException;
import com.imagecaption.platform.exception.InvalidImageException;
import com.imagecaption.platform.provider.InferenceResult;
import com.imagecaption.platform.provider.MockCaptionProvider;
import com.imagecaption.platform.repository.CaptionRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CaptionServiceTest {

    private static final byte[] VALID_JPEG = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10, 0x4A, 0x46};

    @Mock
    private CaptionRequestRepository repository;

    private MockCaptionProvider mockCaptionProvider;
    private CaptionService captionService;

    @BeforeEach
    void setUp() {
        mockCaptionProvider = new MockCaptionProvider("a dog in the yard");
        captionService = new CaptionService(repository, mockCaptionProvider, "10MB", "Xenova/vit-gpt2-image-captioning", "main");
    }

    @Test
    void processCaptionRequest_successFlow() {
        MockMultipartFile file = new MockMultipartFile("image", "dog.jpg", "image/jpeg", VALID_JPEG);

        when(repository.save(any(CaptionRequestEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CaptionRequestDto result = captionService.processCaptionRequest(file, CaptionMode.SHORT);

        assertNotNull(result);
        assertEquals(CaptionStatus.COMPLETED, result.status());
        assertEquals("a dog in the yard", result.generatedCaption());
        assertEquals("dog.jpg", result.originalFilename());
        assertEquals(CaptionMode.SHORT, result.captionMode());
        assertNotNull(result.completedAt());

        verify(repository, org.mockito.Mockito.atLeast(3)).save(any(CaptionRequestEntity.class));
    }

    @Test
    void processCaptionRequest_invalidImageFails() {
        MockMultipartFile file = new MockMultipartFile("image", "corrupt.jpg", "image/jpeg", "not an image".getBytes());

        assertThrows(InvalidImageException.class, () -> captionService.processCaptionRequest(file, CaptionMode.SHORT));
    }

    @Test
    void getCaptionRequest_existingIdReturnsDto() {
        UUID id = UUID.randomUUID();
        CaptionRequestEntity entity = new CaptionRequestEntity(
                id, CaptionStatus.COMPLETED, "dog.jpg", "hash123", CaptionMode.SHORT,
                "model", "version", Instant.now()
        );
        entity.setGeneratedCaption("a test caption");

        when(repository.findById(id)).thenReturn(Optional.of(entity));

        CaptionRequestDto dto = captionService.getCaptionRequest(id);

        assertEquals(id, dto.id());
        assertEquals("a test caption", dto.generatedCaption());
    }

    @Test
    void getCaptionRequest_nonExistingIdThrowsException() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThrows(CaptionNotFoundException.class, () -> captionService.getCaptionRequest(id));
    }
}
