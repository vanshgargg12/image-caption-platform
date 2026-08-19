package com.imagecaption.platform.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "caption_requests")
public class CaptionRequestEntity {

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private CaptionStatus status;

    @Column(name = "original_filename", nullable = false)
    private String originalFilename;

    @Column(name = "image_hash", nullable = false, length = 64)
    private String imageHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "caption_mode", nullable = false, length = 32)
    private CaptionMode captionMode;

    @Column(name = "model_name", nullable = false)
    private String modelName;

    @Column(name = "model_version", nullable = false)
    private String modelVersion;

    @Column(name = "generated_caption", columnDefinition = "TEXT")
    private String generatedCaption;

    @Column(name = "edited_caption", columnDefinition = "TEXT")
    private String editedCaption;

    @Column(name = "inference_time_ms")
    private Long inferenceTimeMs;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "error_code", length = 64)
    private String errorCode;

    public CaptionRequestEntity() {
    }

    public CaptionRequestEntity(UUID id, CaptionStatus status, String originalFilename, String imageHash,
                                CaptionMode captionMode, String modelName, String modelVersion, Instant createdAt) {
        this.id = id;
        this.status = status;
        this.originalFilename = originalFilename;
        this.imageHash = imageHash;
        this.captionMode = captionMode;
        this.modelName = modelName;
        this.modelVersion = modelVersion;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public CaptionStatus getStatus() {
        return status;
    }

    public void setStatus(CaptionStatus status) {
        this.status = status;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
    }

    public String getImageHash() {
        return imageHash;
    }

    public void setImageHash(String imageHash) {
        this.imageHash = imageHash;
    }

    public CaptionMode getCaptionMode() {
        return captionMode;
    }

    public void setCaptionMode(CaptionMode captionMode) {
        this.captionMode = captionMode;
    }

    public String getModelName() {
        return modelName;
    }

    public void setModelName(String modelName) {
        this.modelName = modelName;
    }

    public String getModelVersion() {
        return modelVersion;
    }

    public void setModelVersion(String modelVersion) {
        this.modelVersion = modelVersion;
    }

    public String getGeneratedCaption() {
        return generatedCaption;
    }

    public void setGeneratedCaption(String generatedCaption) {
        this.generatedCaption = generatedCaption;
    }

    public String getEditedCaption() {
        return editedCaption;
    }

    public void setEditedCaption(String editedCaption) {
        this.editedCaption = editedCaption;
    }

    public Long getInferenceTimeMs() {
        return inferenceTimeMs;
    }

    public void setInferenceTimeMs(Long inferenceTimeMs) {
        this.inferenceTimeMs = inferenceTimeMs;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CaptionRequestEntity that = (CaptionRequestEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
