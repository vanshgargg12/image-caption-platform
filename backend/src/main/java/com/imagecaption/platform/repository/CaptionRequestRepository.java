package com.imagecaption.platform.repository;

import com.imagecaption.platform.domain.CaptionRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CaptionRequestRepository extends JpaRepository<CaptionRequestEntity, UUID> {
}
