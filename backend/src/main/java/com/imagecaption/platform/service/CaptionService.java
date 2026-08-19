package com.imagecaption.platform.service;

import com.imagecaption.platform.domain.CaptionMode;
import com.imagecaption.platform.domain.CaptionRequestEntity;
import com.imagecaption.platform.domain.CaptionStatus;
import com.imagecaption.platform.dto.CaptionRequestDto;
import com.imagecaption.platform.exception.CaptionNotFoundException;
import com.imagecaption.platform.exception.InferenceServiceException;
import com.imagecaption.platform.exception.InvalidImageException;
import com.imagecaption.platform.provider.CaptionProvider;
import com.imagecaption.platform.provider.InferenceResult;
import com.imagecaption.platform.repository.CaptionRequestRepository;
import com.imagecaption.platform.util.ImageValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.util.UUID;

@Service
public class CaptionService {

    private static final Logger log = LoggerFactory.getLogger(CaptionService.class);

    private final CaptionRequestRepository repository;
    private final CaptionProvider captionProvider;
    private final long maxFileSizeBytes;
    private final String defaultModelName;
    private final String defaultModelVersion;

    public CaptionService(
            CaptionRequestRepository repository,
            CaptionProvider captionProvider,
            @Value("${spring.servlet.multipart.max-file-size:10MB}") String maxFileSizeStr,
            @Value("${MODEL_ID:Xenova/vit-gpt2-image-captioning}") String defaultModelName,
            @Value("${MODEL_REVISION:main}") String defaultModelVersion) {

        this.repository = repository;
        this.captionProvider = captionProvider;
        this.maxFileSizeBytes = parseMaxFileSize(maxFileSizeStr);
        this.defaultModelName = defaultModelName;
        this.defaultModelVersion = defaultModelVersion;
    }

    @Transactional
    public CaptionRequestDto processCaptionRequest(MultipartFile imageFile, CaptionMode captionMode) {
        CaptionMode mode = captionMode != null ? captionMode : CaptionMode.SHORT;

        // 1. Validate image file (magic bytes, non-empty, size limit)
        ImageValidator.validateImageFile(imageFile, maxFileSizeBytes);

        byte[] bytes;
        try {
            bytes = imageFile.getBytes();
        } catch (IOException e) {
            throw new InvalidImageException("Failed to read uploaded image content.", "UNSUPPORTED_IMAGE_TYPE");
        }

        String sanitizedFilename = ImageValidator.sanitizeFilename(imageFile.getOriginalFilename());
        String imageHash = ImageValidator.calculateSha256(bytes);
        UUID requestId = UUID.randomUUID();
        Instant createdAt = Instant.now();

        // 2. Create CaptionRequest with PENDING status
        CaptionRequestEntity entity = new CaptionRequestEntity(
                requestId,
                CaptionStatus.PENDING,
                sanitizedFilename,
                imageHash,
                mode,
                defaultModelName,
                defaultModelVersion,
                createdAt
        );
        repository.save(entity);

        // 3. Update status to PROCESSING
        entity.setStatus(CaptionStatus.PROCESSING);
        repository.save(entity);

        File tempFile = null;
        try {
            // Write to temporary disk location
            try {
                tempFile = File.createTempFile("caption_upload_" + requestId + "_", ".tmp");
                try (FileOutputStream fos = new FileOutputStream(tempFile)) {
                    fos.write(bytes);
                }
            } catch (IOException e) {
                throw new InvalidImageException("Failed to write temporary upload file.", "INTERNAL_SERVER_ERROR");
            }

            // 4. Invoke inference service via CaptionProvider abstraction
            InferenceResult result = captionProvider.generateCaption(tempFile, mode);

            // 5. Update entity with COMPLETED status and results
            entity.setGeneratedCaption(result.caption());
            entity.setModelName(result.model());
            entity.setModelVersion(result.modelVersion());
            entity.setInferenceTimeMs(result.inferenceTimeMs());
            entity.setCompletedAt(Instant.now());
            entity.setStatus(CaptionStatus.COMPLETED);
            repository.save(entity);

            log.info("Caption request {} completed successfully in {} ms", requestId, result.inferenceTimeMs());
            return toDto(entity);

        } catch (Exception e) {
            String errorCode = "INTERNAL_SERVER_ERROR";
            if (e instanceof InvalidImageException iie) {
                errorCode = iie.getCode();
            } else if (e instanceof InferenceServiceException ise) {
                errorCode = ise.getErrorCode();
            }

            entity.setStatus(CaptionStatus.FAILED);
            entity.setErrorCode(errorCode);
            entity.setCompletedAt(Instant.now());
            repository.save(entity);

            log.error("Caption request {} failed [errorCode={}]: {}", requestId, errorCode, e.getMessage());
            throw e;

        } finally {
            // 6. Delete temporary image file on EVERY path
            if (tempFile != null && tempFile.exists()) {
                try {
                    boolean deleted = tempFile.delete();
                    if (!deleted) {
                        tempFile.deleteOnExit();
                    }
                } catch (Exception e) {
                    log.warn("Failed to delete temporary file: {}", tempFile.getAbsolutePath());
                }
            }
        }
    }

    @Transactional(readOnly = true)
    public CaptionRequestDto getCaptionRequest(UUID id) {
        CaptionRequestEntity entity = repository.findById(id)
                .orElseThrow(() -> new CaptionNotFoundException(id));
        return toDto(entity);
    }

    public static CaptionRequestDto toDto(CaptionRequestEntity entity) {
        return new CaptionRequestDto(
                entity.getId(),
                entity.getStatus(),
                entity.getOriginalFilename(),
                entity.getImageHash(),
                entity.getCaptionMode(),
                entity.getModelName(),
                entity.getModelVersion(),
                entity.getGeneratedCaption(),
                entity.getEditedCaption(),
                entity.getInferenceTimeMs(),
                entity.getCreatedAt(),
                entity.getCompletedAt(),
                entity.getErrorCode()
        );
    }

    private static long parseMaxFileSize(String sizeStr) {
        if (sizeStr == null || sizeStr.isBlank()) {
            return ImageValidator.DEFAULT_MAX_FILE_SIZE_BYTES;
        }
        String cleanStr = sizeStr.trim().toUpperCase();
        if (cleanStr.endsWith("MB")) {
            return Long.parseLong(cleanStr.substring(0, cleanStr.length() - 2)) * 1024 * 1024;
        } else if (cleanStr.endsWith("KB")) {
            return Long.parseLong(cleanStr.substring(0, cleanStr.length() - 2)) * 1024;
        } else if (cleanStr.endsWith("B")) {
            return Long.parseLong(cleanStr.substring(0, cleanStr.length() - 1));
        }
        try {
            return Long.parseLong(cleanStr);
        } catch (NumberFormatException e) {
            return ImageValidator.DEFAULT_MAX_FILE_SIZE_BYTES;
        }
    }
}
