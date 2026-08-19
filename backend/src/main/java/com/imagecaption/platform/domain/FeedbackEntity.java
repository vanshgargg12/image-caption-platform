package com.imagecaption.platform.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "feedback")
public class FeedbackEntity {

    @Id
    private UUID id;

    @Column(name = "caption_request_id", nullable = false)
    private UUID captionRequestId;

    @Enumerated(EnumType.STRING)
    @Column(name = "rating", nullable = false, length = 32)
    private FeedbackRating rating;

    @Column(name = "missing_information", columnDefinition = "TEXT")
    private String missingInformation;

    @Column(name = "incorrect_information", columnDefinition = "TEXT")
    private String incorrectInformation;

    @Column(name = "user_comment", columnDefinition = "TEXT")
    private String userComment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public FeedbackEntity() {
    }

    public FeedbackEntity(UUID id, UUID captionRequestId, FeedbackRating rating, String missingInformation,
                          String incorrectInformation, String userComment, Instant createdAt) {
        this.id = id;
        this.captionRequestId = captionRequestId;
        this.rating = rating;
        this.missingInformation = missingInformation;
        this.incorrectInformation = incorrectInformation;
        this.userComment = userComment;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getCaptionRequestId() {
        return captionRequestId;
    }

    public void setCaptionRequestId(UUID captionRequestId) {
        this.captionRequestId = captionRequestId;
    }

    public FeedbackRating getRating() {
        return rating;
    }

    public void setRating(FeedbackRating rating) {
        this.rating = rating;
    }

    public String getMissingInformation() {
        return missingInformation;
    }

    public void setMissingInformation(String missingInformation) {
        this.missingInformation = missingInformation;
    }

    public String getIncorrectInformation() {
        return incorrectInformation;
    }

    public void setIncorrectInformation(String incorrectInformation) {
        this.incorrectInformation = incorrectInformation;
    }

    public String getUserComment() {
        return userComment;
    }

    public void setUserComment(String userComment) {
        this.userComment = userComment;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        FeedbackEntity that = (FeedbackEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
