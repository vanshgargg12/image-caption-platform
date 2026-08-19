package com.imagecaption.platform.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.imagecaption.platform.domain.FeedbackRating;
import com.imagecaption.platform.dto.FeedbackRequestDto;
import com.imagecaption.platform.provider.CaptionProvider;
import com.imagecaption.platform.provider.MockCaptionProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(locations = "classpath:application-test.properties")
class CaptionIntegrationTest {

    private static final byte[] VALID_JPEG = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10, 0x4A, 0x46};

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CaptionProvider captionProvider;

    private MockCaptionProvider mockProvider;

    @BeforeEach
    void setUp() {
        if (captionProvider instanceof MockCaptionProvider m) {
            this.mockProvider = m;
            mockProvider.setMockCaption("a dog running across a grassy field");
            mockProvider.setSimulateFailure(false);
            mockProvider.setSimulateTimeout(false);
            mockProvider.setSimulateInvalidImage(false);
        }
    }

    @Test
    void fullCaptionAndFeedbackLifecycle_success() throws Exception {
        // 1. Upload valid image
        MockMultipartFile file = new MockMultipartFile("image", "sample-dog.jpg", "image/jpeg", VALID_JPEG);

        MvcResult uploadResult = mockMvc.perform(multipart("/api/v1/captions")
                        .file(file)
                        .param("captionMode", "SHORT"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.generatedCaption").value("a dog running across a grassy field"))
                .andExpect(jsonPath("$.originalFilename").value("sample-dog.jpg"))
                .andReturn();

        String responseJson = uploadResult.getResponse().getContentAsString();
        String idStr = objectMapper.readTree(responseJson).get("id").asText();
        UUID captionId = UUID.fromString(idStr);

        // 2. Retrieve caption details
        mockMvc.perform(get("/api/v1/captions/{id}", captionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(captionId.toString()))
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.generatedCaption").value("a dog running across a grassy field"));

        // 3. Submit feedback
        FeedbackRequestDto feedbackReq = new FeedbackRequestDto(
                FeedbackRating.POSITIVE,
                "Could mention breed",
                null,
                "Accurate overall!"
        );

        mockMvc.perform(post("/api/v1/captions/{id}/feedback", captionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(feedbackReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.captionRequestId").value(captionId.toString()))
                .andExpect(jsonPath("$.rating").value("POSITIVE"));
    }

    @Test
    void uploadImage_missingFileReturns400() throws Exception {
        mockMvc.perform(multipart("/api/v1/captions"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void uploadImage_emptyFileReturns400() throws Exception {
        MockMultipartFile emptyFile = new MockMultipartFile("image", "empty.jpg", "image/jpeg", new byte[0]);

        mockMvc.perform(multipart("/api/v1/captions").file(emptyFile))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("EMPTY_FILE"));
    }

    @Test
    void uploadImage_invalidHeaderBytesReturns400() throws Exception {
        MockMultipartFile badFile = new MockMultipartFile("image", "bad.jpg", "image/jpeg", "not image bytes".getBytes());

        mockMvc.perform(multipart("/api/v1/captions").file(badFile))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_IMAGE_TYPE"));
    }

    @Test
    void uploadImage_inferenceTimeoutReturns504() throws Exception {
        mockProvider.setSimulateTimeout(true);

        MockMultipartFile file = new MockMultipartFile("image", "timeout.jpg", "image/jpeg", VALID_JPEG);

        mockMvc.perform(multipart("/api/v1/captions").file(file))
                .andExpect(status().isGatewayTimeout())
                .andExpect(jsonPath("$.code").value("INFERENCE_TIMEOUT"));
    }

    @Test
    void uploadImage_inferenceUnavailableReturns503() throws Exception {
        mockProvider.setSimulateFailure(true);

        MockMultipartFile file = new MockMultipartFile("image", "fail.jpg", "image/jpeg", VALID_JPEG);

        mockMvc.perform(multipart("/api/v1/captions").file(file))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("INFERENCE_SERVICE_UNAVAILABLE"));
    }
}
