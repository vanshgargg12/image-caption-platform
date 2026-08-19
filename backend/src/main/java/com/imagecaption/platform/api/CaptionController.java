package com.imagecaption.platform.api;

import com.imagecaption.platform.domain.CaptionMode;
import com.imagecaption.platform.dto.CaptionRequestDto;
import com.imagecaption.platform.service.CaptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/captions")
@Tag(name = "Caption API", description = "Endpoints for uploading images and retrieving caption status")
public class CaptionController {

    private final CaptionService captionService;

    public CaptionController(CaptionService captionService) {
        this.captionService = captionService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Submit image for caption generation", description = "Uploads an image (JPEG or PNG, max 10MB) and processes caption generation.")
    public ResponseEntity<CaptionRequestDto> createCaptionRequest(
            @Parameter(description = "Image file (JPEG or PNG)", required = true)
            @RequestPart("image") MultipartFile image,
            @Parameter(description = "Caption generation mode (SHORT or DETAILED)")
            @RequestParam(value = "captionMode", required = false, defaultValue = "SHORT") CaptionMode captionMode) {

        CaptionRequestDto result = captionService.processCaptionRequest(image, captionMode);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get caption request status by ID", description = "Retrieves current status and generated caption output for a request ID.")
    public ResponseEntity<CaptionRequestDto> getCaptionRequest(
            @Parameter(description = "UUID identifier of caption request", required = true)
            @PathVariable("id") UUID id) {

        CaptionRequestDto result = captionService.getCaptionRequest(id);
        return ResponseEntity.ok(result);
    }
}
