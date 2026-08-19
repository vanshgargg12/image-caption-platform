package com.imagecaption.platform.exception;

import com.imagecaption.platform.dto.ErrorResponseDto;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.time.Instant;
import java.util.UUID;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(CaptionNotFoundException.class)
    public ResponseEntity<ErrorResponseDto> handleNotFound(CaptionNotFoundException e, HttpServletRequest request) {
        String requestId = getRequestId(request);
        log.warn("Resource not found [requestId={}]: {}", requestId, e.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponseDto(Instant.now(), requestId, "CAPTION_NOT_FOUND", e.getMessage(), null));
    }

    @ExceptionHandler(InvalidImageException.class)
    public ResponseEntity<ErrorResponseDto> handleInvalidImage(InvalidImageException e, HttpServletRequest request) {
        String requestId = getRequestId(request);
        log.warn("Invalid image upload [requestId={}]: {}", requestId, e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponseDto(Instant.now(), requestId, e.getCode(), e.getMessage(), null));
    }

    @ExceptionHandler({org.springframework.web.multipart.support.MissingServletRequestPartException.class, org.springframework.web.multipart.MultipartException.class})
    public ResponseEntity<ErrorResponseDto> handleMissingMultipartFile(Exception e, HttpServletRequest request) {
        String requestId = getRequestId(request);
        log.warn("Missing multipart image file [requestId={}]: {}", requestId, e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponseDto(Instant.now(), requestId, "MISSING_IMAGE_FILE",
                        "Multipart request must include an 'image' file upload.", null));
    }

    @ExceptionHandler({PayloadTooLargeException.class, MaxUploadSizeExceededException.class})
    public ResponseEntity<ErrorResponseDto> handlePayloadTooLarge(Exception e, HttpServletRequest request) {
        String requestId = getRequestId(request);
        log.warn("Payload size limit exceeded [requestId={}]: {}", requestId, e.getMessage());
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(new ErrorResponseDto(Instant.now(), requestId, "PAYLOAD_TOO_LARGE",
                        "Uploaded file size exceeds the maximum allowed limit.", null));
    }

    @ExceptionHandler(InferenceServiceException.class)
    public ResponseEntity<ErrorResponseDto> handleInferenceError(InferenceServiceException e, HttpServletRequest request) {
        String requestId = getRequestId(request);
        log.error("Inference service failure [requestId={}]: {}", requestId, e.getMessage());

        HttpStatus status;
        if (e.getStatusCode() == 504 || "INFERENCE_TIMEOUT".equals(e.getErrorCode())) {
            status = HttpStatus.GATEWAY_TIMEOUT;
        } else if (e.getStatusCode() == 503 || "MODEL_NOT_READY".equals(e.getErrorCode())) {
            status = HttpStatus.SERVICE_UNAVAILABLE;
        } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
        }

        return ResponseEntity.status(status)
                .body(new ErrorResponseDto(Instant.now(), requestId, e.getErrorCode(), e.getMessage(), null));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponseDto> handleValidationErrors(MethodArgumentNotValidException e, HttpServletRequest request) {
        String requestId = getRequestId(request);
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .findFirst()
                .orElse("Validation error occurred");

        log.warn("Validation failure [requestId={}]: {}", requestId, message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponseDto(Instant.now(), requestId, "INVALID_INPUT", message, null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponseDto> handleUnhandledException(Exception e, HttpServletRequest request) {
        String requestId = getRequestId(request);
        log.error("Unhandled Exception [requestId={}]: {}", requestId, e.getMessage(), e);

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponseDto(Instant.now(), requestId, "INTERNAL_SERVER_ERROR",
                        "An unexpected server error occurred.", null));
    }

    private String getRequestId(HttpServletRequest request) {
        String header = request.getHeader("X-Request-ID");
        return (header != null && !header.isBlank()) ? header : UUID.randomUUID().toString();
    }
}
