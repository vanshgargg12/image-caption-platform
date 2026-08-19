package com.imagecaption.platform.provider;

import com.imagecaption.platform.domain.CaptionMode;
import com.imagecaption.platform.exception.InferenceServiceException;
import com.imagecaption.platform.exception.InvalidImageException;
import com.imagecaption.platform.exception.PayloadTooLargeException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.io.File;
import java.util.Map;
import java.util.UUID;

@Component
@Primary
@org.springframework.context.annotation.Profile("!test")
public class TransformersJsCaptionProvider implements CaptionProvider {

    private static final Logger log = LoggerFactory.getLogger(TransformersJsCaptionProvider.class);

    private final RestClient restClient;
    private final int maxRetries;

    public TransformersJsCaptionProvider(
            @Value("${inference.base-url:http://localhost:3001}") String baseUrl,
            @Value("${inference.client.connect-timeout-ms:5000}") int connectTimeout,
            @Value("${inference.client.read-timeout-ms:30000}") int readTimeout,
            @Value("${inference.client.max-retries:2}") int maxRetries) {

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeout);
        requestFactory.setReadTimeout(readTimeout);

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
        this.maxRetries = Math.max(1, maxRetries);
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
                            if (status == 400) {
                                throw new InvalidImageException("Inference service rejected the input image as invalid or unsupported.", "UNSUPPORTED_IMAGE_TYPE");
                            }
                            throw new InferenceServiceException("Inference service returned client error (" + status + ")", "CLIENT_ERROR", status);
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
                log.warn("Non-retryable error during inference [requestId={}]: {}", requestId, e.getMessage());
                throw e;
            } catch (RestClientResponseException e) {
                lastException = e;
                if (e.getStatusCode().is4xxClientError()) {
                    log.warn("Client error returned by inference service [status={}]: {}", e.getStatusCode().value(), e.getMessage());
                    throw new InferenceServiceException("Inference service returned 4xx error", "CLIENT_ERROR", e.getStatusCode().value(), e);
                }
                log.warn("Transient 5xx server error from inference service (attempt {}/{}): {}", attempts, maxRetries, e.getMessage());
            } catch (Exception e) {
                lastException = e;
                log.warn("Transient I/O or network failure contacting inference service (attempt {}/{}): {}", attempts, maxRetries, e.getMessage());
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
