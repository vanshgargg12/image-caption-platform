package com.imagecaption.platform.repository;

import com.imagecaption.platform.domain.FeedbackEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FeedbackRepository extends JpaRepository<FeedbackEntity, UUID> {
    List<FeedbackEntity> findByCaptionRequestId(UUID captionRequestId);
}
