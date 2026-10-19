package com.imagecaption.platform.service;

import com.imagecaption.platform.domain.CaptionMode;
import com.imagecaption.platform.domain.CaptionRequestEntity;
import com.imagecaption.platform.domain.CaptionStatus;
import com.imagecaption.platform.dto.CaptionRequestDto;
import com.imagecaption.platform.exception.CaptionNotFoundException;
import com.imagecaption.platform.exception.InferenceServiceException;
import com.imagecaption.platform.exception.InvalidImageException;
import com.imagecaption.platform.provider.CaptionProvider;
import com.imagecaption.platform.provider.MockCaptionProvider;
import com.imagecaption.platform.repository.CaptionRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CaptionServiceTest {

    private static final byte[] VALID_JPEG = createRealJpeg();

    @Mock
    private CaptionRequestRepository repository;

    private MockCaptionProvider mockCaptionProvider;
    private CaptionService captionService;

    private static byte[] createRealJpeg() {
        try {
            BufferedImage img = new BufferedImage(32, 32, BufferedImage.TYPE_INT_RGB);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(img, "jpg", baos);
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

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

        verify(repository, atLeast(3)).save(any(CaptionRequestEntity.class));
    }

    @Test
    void processCaptionRequest_invalidImageFails() {
        MockMultipartFile file = new MockMultipartFile("image", "corrupt.jpg", "image/jpeg", "not an image".getBytes());

        assertThrows(InvalidImageException.class, () -> captionService.processCaptionRequest(file, CaptionMode.SHORT));
    }

    @Test
    void processCaptionRequest_providerThrowsInvalidImage_savesFailedEntity() {
        MockMultipartFile file = new MockMultipartFile("image", "dog.jpg", "image/jpeg", VALID_JPEG);

        CaptionProvider failingProvider = (f, m) -> {
            throw new InvalidImageException("Unsupported mode DETAILED", "UNSUPPORTED_CAPTION_MODE");
        };
        CaptionService service = new CaptionService(repository, failingProvider, "10MB", "model", "version");

        when(repository.save(any(CaptionRequestEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        InvalidImageException ex = assertThrows(InvalidImageException.class,
                () -> service.processCaptionRequest(file, CaptionMode.SHORT));
        assertEquals("UNSUPPORTED_CAPTION_MODE", ex.getCode());

        ArgumentCaptor<CaptionRequestEntity> captor = ArgumentCaptor.forClass(CaptionRequestEntity.class);
        verify(repository, atLeastOnce()).save(captor.capture());

        CaptionRequestEntity lastSaved = captor.getValue();
        assertEquals(CaptionStatus.FAILED, lastSaved.getStatus());
        assertEquals("UNSUPPORTED_CAPTION_MODE", lastSaved.getErrorCode());
        assertNotNull(lastSaved.getCompletedAt());
    }

    @Test
    void processCaptionRequest_providerThrowsCorruptImage_savesFailedEntity() {
        MockMultipartFile file = new MockMultipartFile("image", "corrupt.jpg", "image/jpeg", VALID_JPEG);

        CaptionProvider failingProvider = (f, m) -> {
            throw new InvalidImageException("Image is corrupt", "CORRUPT_IMAGE");
        };
        CaptionService service = new CaptionService(repository, failingProvider, "10MB", "model", "version");

        when(repository.save(any(CaptionRequestEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        InvalidImageException ex = assertThrows(InvalidImageException.class,
                () -> service.processCaptionRequest(file, CaptionMode.SHORT));
        assertEquals("CORRUPT_IMAGE", ex.getCode());

        ArgumentCaptor<CaptionRequestEntity> captor = ArgumentCaptor.forClass(CaptionRequestEntity.class);
        verify(repository, atLeastOnce()).save(captor.capture());

        CaptionRequestEntity lastSaved = captor.getValue();
        assertEquals(CaptionStatus.FAILED, lastSaved.getStatus());
        assertEquals("CORRUPT_IMAGE", lastSaved.getErrorCode());
        assertNotNull(lastSaved.getCompletedAt());
    }

    @Test
    void processCaptionRequest_providerThrowsInferenceServiceException_savesFailedEntity() {
        MockMultipartFile file = new MockMultipartFile("image", "dog.jpg", "image/jpeg", VALID_JPEG);

        CaptionProvider failingProvider = (f, m) -> {
            throw new InferenceServiceException("Caption generation failed", "CAPTION_GENERATION_FAILED", 500);
        };
        CaptionService service = new CaptionService(repository, failingProvider, "10MB", "model", "version");

        when(repository.save(any(CaptionRequestEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        InferenceServiceException ex = assertThrows(InferenceServiceException.class,
                () -> service.processCaptionRequest(file, CaptionMode.SHORT));
        assertEquals("CAPTION_GENERATION_FAILED", ex.getErrorCode());

        ArgumentCaptor<CaptionRequestEntity> captor = ArgumentCaptor.forClass(CaptionRequestEntity.class);
        verify(repository, atLeastOnce()).save(captor.capture());

        CaptionRequestEntity lastSaved = captor.getValue();
        assertEquals(CaptionStatus.FAILED, lastSaved.getStatus());
        assertEquals("CAPTION_GENERATION_FAILED", lastSaved.getErrorCode());
        assertNotNull(lastSaved.getCompletedAt());
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
