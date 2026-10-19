package com.imagecaption.platform.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.imagecaption.platform.domain.CaptionMode;
import com.imagecaption.platform.exception.InferenceServiceException;
import com.imagecaption.platform.exception.InvalidImageException;
import com.imagecaption.platform.exception.PayloadTooLargeException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Component
@Primary
@org.springframework.context.annotation.Profile("!test")
public class TransformersJsCaptionProvider implements CaptionProvider {

    private static final Logger log = LoggerFactory.getLogger(TransformersJsCaptionProvider.class);

    private final RestClient restClient;
    private final int maxRetries;
    private final ObjectMapper objectMapper;

    @Autowired
    public TransformersJsCaptionProvider(
            @Value("${inference.base-url:http://localhost:3001}") String baseUrl,
            @Value("${inference.client.connect-timeout-ms:5000}") int connectTimeout,
            @Value("${inference.client.read-timeout-ms:30000}") int readTimeout,
            @Value("${inference.client.max-retries:2}") int maxRetries,
            ObjectMapper objectMapper) {

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeout);
        requestFactory.setReadTimeout(readTimeout);

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
        this.maxRetries = Math.max(1, maxRetries);
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    public TransformersJsCaptionProvider(
            String baseUrl,
            int connectTimeout,
            int readTimeout,
            int maxRetries) {
        this(baseUrl, connectTimeout, readTimeout, maxRetries, new ObjectMapper());
    }

    TransformersJsCaptionProvider(RestClient restClient, int maxRetries) {
        this(restClient, maxRetries, new ObjectMapper());
    }

    TransformersJsCaptionProvider(RestClient restClient, int maxRetries, ObjectMapper objectMapper) {
        this.restClient = restClient;
        this.maxRetries = Math.max(1, maxRetries);
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    @Override
    public InferenceResult generateCaption(File imageFile, CaptionMode mode) {
        String requestId = UUID.randomUUID().toString();

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("image", new FileSystemResource(imageFile));
        body.add("mode", mode.name());

        int attempts = 0;
        Exception lastException = null;

        while (attempts < maxRetries) {
            attempts++;
            try {
                log.info("Sending inference request attempt {}/{} [requestId={}]", attempts, maxRetries, requestId);

                InferenceResponseDto response = restClient.post()
                        .uri("/internal/infer")
                        .header("X-Request-ID", requestId)
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(body)
                        .retrieve()
                        .onStatus(HttpStatusCode::is4xxClientError, (req, resp) -> {
                            int status = resp.getStatusCode().value();
                            if (status == 413) {
                                throw new PayloadTooLargeException("Uploaded file size exceeds the maximum limit supported by the inference service.");
                            }
                            String bodyStr = "";
                            try {
                                byte[] bodyBytes = resp.getBody().readAllBytes();
                                bodyStr = new String(bodyBytes, StandardCharsets.UTF_8);
                            } catch (Exception ignored) {
                            }
                            String code = "CLIENT_ERROR";
                            String message = "Inference service returned client error (" + status + ")";
                            if (!bodyStr.isBlank()) {
                                try {
                                    JsonNode root = objectMapper.readTree(bodyStr);
                                    if (root.hasNonNull("code") && !root.get("code").asText().isBlank()) {
                                        code = root.get("code").asText();
                                    }
                                    if (root.hasNonNull("message") && !root.get("message").asText().isBlank()) {
                                        message = root.get("message").asText();
                                    }
                                } catch (Exception ignored) {
                                }
                            }
                            throw new InvalidImageException(message, code);
                        })
                        .onStatus(HttpStatusCode::is5xxServerError, (req, resp) -> {
                            int status = resp.getStatusCode().value();
                            String bodyStr = "";
                            try {
                                byte[] bodyBytes = resp.getBody().readAllBytes();
                                bodyStr = new String(bodyBytes, StandardCharsets.UTF_8);
                            } catch (Exception ignored) {
                            }
                            String code = null;
                            String message = "Inference service returned server error (" + status + ")";
                            if (!bodyStr.isBlank()) {
                                try {
                                    JsonNode root = objectMapper.readTree(bodyStr);
                                    if (root.hasNonNull("code") && !root.get("code").asText().isBlank()) {
                                        code = root.get("code").asText();
                                    }
                                    if (root.hasNonNull("message") && !root.get("message").asText().isBlank()) {
                                        message = root.get("message").asText();
                                    }
                                } catch (Exception ignored) {
                                }
                            }
                            if ("CAPTION_GENERATION_FAILED".equals(code)) {
                                throw new InferenceServiceException(message, "CAPTION_GENERATION_FAILED", status);
                            }
                            if (status == 503 || status == 504) {
                                throw new InferenceServiceException(message, code != null ? code : (status == 504 ? "INFERENCE_TIMEOUT" : "MODEL_NOT_READY"), status);
                            }
                            throw new InferenceServiceException(message, code != null ? code : "INTERNAL_SERVER_ERROR", status);
                        })
                        .body(InferenceResponseDto.class);

                if (response == null || response.caption() == null) {
                    throw new InferenceServiceException("Empty response body returned from inference service", "EMPTY_INFERENCE_RESPONSE", 500);
                }

                log.info("Inference completed successfully in {} ms [requestId={}]", response.inferenceTimeMs(), requestId);
                return new InferenceResult(
                        response.caption(),
                        response.model(),
                        response.modelVersion(),
                        response.mode(),
                        response.inferenceTimeMs(),
                        response.requestId()
                );

            } catch (InvalidImageException | PayloadTooLargeException e) {
                // DO NOT RETRY 4xx client validation errors
                log.warn("Non-retryable client error during inference [requestId={}]: {}", requestId, e.getMessage());
                throw e;
            } catch (org.springframework.web.client.HttpClientErrorException e) {
                // DO NOT RETRY any 4xx client errors
                log.warn("Non-retryable 4xx client error during inference [requestId={}]: {}", requestId, e.getMessage());
                throw e;
            } catch (InferenceServiceException e) {
                if ("CAPTION_GENERATION_FAILED".equals(e.getErrorCode())) {
                    log.warn("Deterministic caption generation failure from inference service [requestId={}]: {}", requestId, e.getMessage());
                    throw e; // DO NOT RETRY
                }
                if (e.getStatusCode() == 503 || e.getStatusCode() == 504) {
                    lastException = e;
                    log.warn("Transient {} error from inference service (attempt {}/{}): {}", e.getStatusCode(), attempts, maxRetries, e.getMessage());
                } else {
                    log.warn("Non-retryable server error from inference service [requestId={}, errorCode={}]: {}", requestId, e.getErrorCode(), e.getMessage());
                    throw e; // DO NOT RETRY
                }
            } catch (ResourceAccessException e) {
                // Retry only on connection errors
                lastException = e;
                log.warn("Transient connection failure contacting inference service (attempt {}/{}): {}", attempts, maxRetries, e.getMessage());
            } catch (RuntimeException e) {
                log.warn("Non-retryable unexpected failure during inference [requestId={}]: {}", requestId, e.getMessage());
                throw e;
            }
        }

        throw new InferenceServiceException(
                "Inference service failed after " + maxRetries + " attempts: " +
                        (lastException != null ? lastException.getMessage() : "Unknown error"),
                "INFERENCE_SERVICE_UNAVAILABLE",
                503,
                lastException
        );
    }

    public record InferenceResponseDto(
            String caption,
            String model,
            String modelVersion,
            String mode,
            long inferenceTimeMs,
            String requestId
    ) {
    }
}
