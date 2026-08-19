package com.imagecaption.platform.api;

import com.imagecaption.platform.domain.CaptionMode;
import com.imagecaption.platform.domain.CaptionStatus;
import com.imagecaption.platform.dto.CaptionRequestDto;
import com.imagecaption.platform.exception.CaptionNotFoundException;
import com.imagecaption.platform.exception.GlobalExceptionHandler;
import com.imagecaption.platform.exception.InvalidImageException;
import com.imagecaption.platform.service.CaptionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CaptionController.class)
@Import(GlobalExceptionHandler.class)
class CaptionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CaptionService captionService;

    private static final byte[] VALID_JPEG = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10, 0x4A, 0x46};

    @Test
    void createCaptionRequest_successReturns201() throws Exception {
        UUID id = UUID.randomUUID();
        CaptionRequestDto dto = new CaptionRequestDto(
                id, CaptionStatus.COMPLETED, "dog.jpg", "hash123", CaptionMode.SHORT,
                "Xenova/vit-gpt2-image-captioning", "main", "a dog running", null, 300L,
                Instant.now(), Instant.now(), null
        );

        when(captionService.processCaptionRequest(any(), eq(CaptionMode.SHORT))).thenReturn(dto);

        MockMultipartFile file = new MockMultipartFile("image", "dog.jpg", "image/jpeg", VALID_JPEG);

        mockMvc.perform(multipart("/api/v1/captions")
                        .file(file)
                        .param("captionMode", "SHORT"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.generatedCaption").value("a dog running"));
    }

    @Test
    void createCaptionRequest_invalidImageReturns400() throws Exception {
        when(captionService.processCaptionRequest(any(), any()))
                .thenThrow(new InvalidImageException("File headers do not match a valid JPEG or PNG image.", "UNSUPPORTED_IMAGE_TYPE"));

        MockMultipartFile file = new MockMultipartFile("image", "bad.txt", "text/plain", "invalid".getBytes());

        mockMvc.perform(multipart("/api/v1/captions").file(file))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_IMAGE_TYPE"));
    }

    @Test
    void getCaptionRequest_existingIdReturns200() throws Exception {
        UUID id = UUID.randomUUID();
        CaptionRequestDto dto = new CaptionRequestDto(
                id, CaptionStatus.COMPLETED, "dog.jpg", "hash123", CaptionMode.SHORT,
                "Xenova/vit-gpt2-image-captioning", "main", "a dog running", null, 300L,
                Instant.now(), Instant.now(), null
        );

        when(captionService.getCaptionRequest(id)).thenReturn(dto);

        mockMvc.perform(get("/api/v1/captions/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    void getCaptionRequest_nonExistingIdReturns404() throws Exception {
        UUID id = UUID.randomUUID();
        when(captionService.getCaptionRequest(id)).thenThrow(new CaptionNotFoundException(id));

        mockMvc.perform(get("/api/v1/captions/{id}", id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CAPTION_NOT_FOUND"));
    }
}
