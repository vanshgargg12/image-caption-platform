package com.imagecaption.platform.provider;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.imagecaption.platform.domain.CaptionMode;
import com.imagecaption.platform.exception.InferenceServiceException;
import com.imagecaption.platform.exception.InvalidImageException;
import com.imagecaption.platform.exception.PayloadTooLargeException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class TransformersJsCaptionProviderTest {

    @TempDir
    File tempDir;

    private File sampleFile;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() throws IOException {
        objectMapper = new ObjectMapper();
        sampleFile = new File(tempDir, "test.jpg");
        BufferedImage img = new BufferedImage(32, 32, BufferedImage.TYPE_INT_RGB);
        try (FileOutputStream fos = new FileOutputStream(sampleFile)) {
            ImageIO.write(img, "jpg", fos);
        }
    }

    @Test
    void providerInitialization_success() {
        TransformersJsCaptionProvider provider = new TransformersJsCaptionProvider(
                "http://localhost:3001", 1000, 2000, 2, objectMapper
        );
        assertNotNull(provider);
    }

    @Test
    void generateCaption_400WithUnsupportedCaptionMode_surfacesExactCode() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:3001");
        MockRestServiceServer mockServer = MockRestServiceServer.bindTo(builder).build();
        TransformersJsCaptionProvider provider = new TransformersJsCaptionProvider(builder.build(), 2, objectMapper);

        mockServer.expect(requestTo("http://localhost:3001/internal/infer"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"code\":\"UNSUPPORTED_CAPTION_MODE\",\"message\":\"Model does not support caption mode DETAILED\"}"));

        InvalidImageException ex = assertThrows(InvalidImageException.class,
                () -> provider.generateCaption(sampleFile, CaptionMode.DETAILED));

        assertEquals("UNSUPPORTED_CAPTION_MODE", ex.getCode());
        assertEquals("Model does not support caption mode DETAILED", ex.getMessage());
        mockServer.verify();
    }

    @Test
    void generateCaption_400WithCorruptImage_surfacesExactCode() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:3001");
        MockRestServiceServer mockServer = MockRestServiceServer.bindTo(builder).build();
        TransformersJsCaptionProvider provider = new TransformersJsCaptionProvider(builder.build(), 2, objectMapper);

        mockServer.expect(requestTo("http://localhost:3001/internal/infer"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"code\":\"CORRUPT_IMAGE\",\"message\":\"Image is corrupt, truncated, or not a valid JPEG/PNG/WebP.\"}"));

        InvalidImageException ex = assertThrows(InvalidImageException.class,
                () -> provider.generateCaption(sampleFile, CaptionMode.SHORT));

        assertEquals("CORRUPT_IMAGE", ex.getCode());
        assertEquals("Image is corrupt, truncated, or not a valid JPEG/PNG/WebP.", ex.getMessage());
        mockServer.verify();
    }

    @Test
    void generateCaption_500WithCaptionGenerationFailed_doesNotRetry() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:3001");
        MockRestServiceServer mockServer = MockRestServiceServer.bindTo(builder).build();
        TransformersJsCaptionProvider provider = new TransformersJsCaptionProvider(builder.build(), 3, objectMapper);

        // Expect exactly 1 request (no retry)
        mockServer.expect(requestTo("http://localhost:3001/internal/infer"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"code\":\"CAPTION_GENERATION_FAILED\",\"message\":\"Failed to generate caption for the provided image.\"}"));

        InferenceServiceException ex = assertThrows(InferenceServiceException.class,
                () -> provider.generateCaption(sampleFile, CaptionMode.SHORT));

        assertEquals("CAPTION_GENERATION_FAILED", ex.getErrorCode());
        mockServer.verify();
    }

    @Test
    void generateCaption_413PayloadTooLarge_doesNotRetry() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:3001");
        MockRestServiceServer mockServer = MockRestServiceServer.bindTo(builder).build();
        TransformersJsCaptionProvider provider = new TransformersJsCaptionProvider(builder.build(), 3, objectMapper);

        mockServer.expect(requestTo("http://localhost:3001/internal/infer"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.PAYLOAD_TOO_LARGE));

        assertThrows(PayloadTooLargeException.class,
                () -> provider.generateCaption(sampleFile, CaptionMode.SHORT));
        mockServer.verify();
    }

    @Test
    void generateCaption_400WithUnparseableBody_fallsBackToClientError() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:3001");
        MockRestServiceServer mockServer = MockRestServiceServer.bindTo(builder).build();
        TransformersJsCaptionProvider provider = new TransformersJsCaptionProvider(builder.build(), 3, objectMapper);

        mockServer.expect(requestTo("http://localhost:3001/internal/infer"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST)
                        .contentType(MediaType.TEXT_PLAIN)
                        .body("Bad Request - not json"));

        InvalidImageException ex = assertThrows(InvalidImageException.class,
                () -> provider.generateCaption(sampleFile, CaptionMode.SHORT));

        assertEquals("CLIENT_ERROR", ex.getCode());
        mockServer.verify();
    }

    @Test
    void generateCaption_400WithUnsupportedCaptionMode_doesNotRetry() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:3001");
        MockRestServiceServer mockServer = MockRestServiceServer.bindTo(builder).build();
        TransformersJsCaptionProvider provider = new TransformersJsCaptionProvider(builder.build(), 3, objectMapper);

        mockServer.expect(requestTo("http://localhost:3001/internal/infer"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"code\":\"UNSUPPORTED_CAPTION_MODE\",\"message\":\"Unsupported caption mode\"}"));

        InvalidImageException ex = assertThrows(InvalidImageException.class,
                () -> provider.generateCaption(sampleFile, CaptionMode.SHORT));

        assertEquals("UNSUPPORTED_CAPTION_MODE", ex.getCode());
        mockServer.verify();
    }

    @Test
    void generateCaption_500InternalServerError_doesNotRetry() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:3001");
        MockRestServiceServer mockServer = MockRestServiceServer.bindTo(builder).build();
        TransformersJsCaptionProvider provider = new TransformersJsCaptionProvider(builder.build(), 3, objectMapper);

        mockServer.expect(requestTo("http://localhost:3001/internal/infer"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"code\":\"INTERNAL_SERVER_ERROR\",\"message\":\"Crash\"}"));

        InferenceServiceException ex = assertThrows(InferenceServiceException.class,
                () -> provider.generateCaption(sampleFile, CaptionMode.SHORT));

        assertEquals("INTERNAL_SERVER_ERROR", ex.getErrorCode());
        mockServer.verify();
    }

    @Test
    void generateCaption_503ServiceUnavailable_retriesMaxAttempts() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:3001");
        MockRestServiceServer mockServer = MockRestServiceServer.bindTo(builder).build();
        TransformersJsCaptionProvider provider = new TransformersJsCaptionProvider(builder.build(), 2, objectMapper);

        mockServer.expect(requestTo("http://localhost:3001/internal/infer"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        mockServer.expect(requestTo("http://localhost:3001/internal/infer"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        InferenceServiceException ex = assertThrows(InferenceServiceException.class,
                () -> provider.generateCaption(sampleFile, CaptionMode.SHORT));

        assertEquals("INFERENCE_SERVICE_UNAVAILABLE", ex.getErrorCode());
        mockServer.verify();
    }

    @Test
    void generateCaption_504GatewayTimeout_retriesMaxAttempts() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:3001");
        MockRestServiceServer mockServer = MockRestServiceServer.bindTo(builder).build();
        TransformersJsCaptionProvider provider = new TransformersJsCaptionProvider(builder.build(), 2, objectMapper);

        mockServer.expect(requestTo("http://localhost:3001/internal/infer"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.GATEWAY_TIMEOUT));

        mockServer.expect(requestTo("http://localhost:3001/internal/infer"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.GATEWAY_TIMEOUT));

        InferenceServiceException ex = assertThrows(InferenceServiceException.class,
                () -> provider.generateCaption(sampleFile, CaptionMode.SHORT));

        assertEquals("INFERENCE_SERVICE_UNAVAILABLE", ex.getErrorCode());
        mockServer.verify();
    }

    @Test
    void generateCaption_503ThenSuccess_retriesAndSucceeds() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:3001");
        MockRestServiceServer mockServer = MockRestServiceServer.bindTo(builder).build();
        TransformersJsCaptionProvider provider = new TransformersJsCaptionProvider(builder.build(), 2, objectMapper);

        mockServer.expect(requestTo("http://localhost:3001/internal/infer"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        mockServer.expect(requestTo("http://localhost:3001/internal/infer"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("{\"caption\":\"a running puppy\",\"model\":\"model\",\"modelVersion\":\"main\",\"mode\":\"SHORT\",\"inferenceTimeMs\":150,\"requestId\":\"req-1\"}", MediaType.APPLICATION_JSON));

        InferenceResult result = provider.generateCaption(sampleFile, CaptionMode.SHORT);
        assertNotNull(result);
        assertEquals("a running puppy", result.caption());
        mockServer.verify();
    }

    @Test
    void generateCaption_success() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:3001");
        MockRestServiceServer mockServer = MockRestServiceServer.bindTo(builder).build();
        TransformersJsCaptionProvider provider = new TransformersJsCaptionProvider(builder.build(), 2, objectMapper);

        mockServer.expect(requestTo("http://localhost:3001/internal/infer"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("{\"caption\":\"a running puppy\",\"model\":\"model\",\"modelVersion\":\"main\",\"mode\":\"SHORT\",\"inferenceTimeMs\":150,\"requestId\":\"req-1\"}", MediaType.APPLICATION_JSON));

        InferenceResult result = provider.generateCaption(sampleFile, CaptionMode.SHORT);
        assertNotNull(result);
        assertEquals("a running puppy", result.caption());
        mockServer.verify();
    }
}
