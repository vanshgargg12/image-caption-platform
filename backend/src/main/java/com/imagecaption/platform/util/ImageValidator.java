package com.imagecaption.platform.util;

import com.imagecaption.platform.exception.InvalidImageException;
import com.imagecaption.platform.exception.PayloadTooLargeException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

public class ImageValidator {

    public static final long DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

    public static void validateImageFile(MultipartFile file, long maxSizeBytes) {
        if (file == null) {
            throw new InvalidImageException("Multipart request must include an 'image' file upload.", "MISSING_IMAGE_FILE");
        }

        if (file.isEmpty() || file.getSize() == 0) {
            throw new InvalidImageException("Uploaded image file is empty or corrupted.", "EMPTY_FILE");
        }

        if (file.getSize() > maxSizeBytes) {
            throw new PayloadTooLargeException(
                    String.format("Uploaded image size (%d bytes) exceeds the maximum allowed limit of %d bytes.",
                            file.getSize(), maxSizeBytes)
            );
        }

        try (InputStream inputStream = file.getInputStream()) {
            byte[] header = new byte[8];
            int bytesRead = inputStream.read(header, 0, 8);

            if (bytesRead < 4) {
                throw new InvalidImageException("Uploaded image file is empty or corrupted.", "EMPTY_FILE");
            }

            boolean isJpeg = (header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF;
            boolean isPng = (header[0] & 0xFF) == 0x89 &&
                    (header[1] & 0xFF) == 0x50 &&
                    (header[2] & 0xFF) == 0x4E &&
                    (header[3] & 0xFF) == 0x47 &&
                    (header[4] & 0xFF) == 0x0D &&
                    (header[5] & 0xFF) == 0x0A &&
                    (header[6] & 0xFF) == 0x1A &&
                    (header[7] & 0xFF) == 0x0A;

            if (!isJpeg && !isPng) {
                throw new InvalidImageException(
                        "File headers do not match a valid JPEG or PNG image.",
                        "UNSUPPORTED_IMAGE_TYPE"
                );
            }
        } catch (IOException e) {
            throw new InvalidImageException("Failed to read uploaded image bytes.", "UNSUPPORTED_IMAGE_TYPE");
        }
    }

    public static String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "upload.jpg";
        }
        // Extract trailing filename component if path was passed
        String nameOnly = filename;
        int lastSlash = Math.max(filename.lastIndexOf('/'), filename.lastIndexOf('\\'));
        if (lastSlash >= 0) {
            nameOnly = filename.substring(lastSlash + 1);
        }
        // Remove special characters, keeping alphanumeric, dots, hyphens, and underscores
        String sanitized = nameOnly.replaceAll("[^a-zA-Z0-9._-]", "_");
        return sanitized.isEmpty() ? "upload.jpg" : sanitized;
    }

    public static String calculateSha256(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(bytes);
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 digest algorithm not available", e);
        }
    }
}
