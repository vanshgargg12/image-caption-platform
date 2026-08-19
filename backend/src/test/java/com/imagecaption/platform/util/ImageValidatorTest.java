package com.imagecaption.platform.util;

import com.imagecaption.platform.exception.InvalidImageException;
import com.imagecaption.platform.exception.PayloadTooLargeException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ImageValidatorTest {

    private static final byte[] VALID_JPEG = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10, 0x4A, 0x46};
    private static final byte[] VALID_PNG = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] INVALID_TEXT = "plain text not an image".getBytes();

    @Test
    void validateImageFile_validJpegPasses() {
        MockMultipartFile file = new MockMultipartFile("image", "photo.jpg", "image/jpeg", VALID_JPEG);
        assertDoesNotThrow(() -> ImageValidator.validateImageFile(file, 10 * 1024 * 1024));
    }

    @Test
    void validateImageFile_validPngPasses() {
        MockMultipartFile file = new MockMultipartFile("image", "graphic.png", "image/png", VALID_PNG);
        assertDoesNotThrow(() -> ImageValidator.validateImageFile(file, 10 * 1024 * 1024));
    }

    @Test
    void validateImageFile_missingFileThrowsException() {
        InvalidImageException ex = assertThrows(InvalidImageException.class,
                () -> ImageValidator.validateImageFile(null, 10 * 1024 * 1024));
        assertEquals("MISSING_IMAGE_FILE", ex.getCode());
    }

    @Test
    void validateImageFile_emptyFileThrowsException() {
        MockMultipartFile emptyFile = new MockMultipartFile("image", "empty.jpg", "image/jpeg", new byte[0]);
        InvalidImageException ex = assertThrows(InvalidImageException.class,
                () -> ImageValidator.validateImageFile(emptyFile, 10 * 1024 * 1024));
        assertEquals("EMPTY_FILE", ex.getCode());
    }

    @Test
    void validateImageFile_oversizedFileThrowsException() {
        MockMultipartFile file = new MockMultipartFile("image", "large.jpg", "image/jpeg", VALID_JPEG);
        PayloadTooLargeException ex = assertThrows(PayloadTooLargeException.class,
                () -> ImageValidator.validateImageFile(file, 4)); // max 4 bytes
        assertNotNull(ex.getMessage());
    }

    @Test
    void validateImageFile_invalidMagicBytesThrowsException() {
        MockMultipartFile textFile = new MockMultipartFile("image", "doc.jpg", "image/jpeg", INVALID_TEXT);
        InvalidImageException ex = assertThrows(InvalidImageException.class,
                () -> ImageValidator.validateImageFile(textFile, 10 * 1024 * 1024));
        assertEquals("UNSUPPORTED_IMAGE_TYPE", ex.getCode());
    }

    @Test
    void sanitizeFilename_stripsPathTraversalAndSpecialChars() {
        assertEquals("photo.jpg", ImageValidator.sanitizeFilename("../../photo.jpg"));
        assertEquals("my_test_img.png", ImageValidator.sanitizeFilename("my test<img.png"));
        assertEquals("upload.jpg", ImageValidator.sanitizeFilename(""));
        assertEquals("upload.jpg", ImageValidator.sanitizeFilename(null));
    }

    @Test
    void calculateSha256_generatesCorrectHash() {
        String hash = ImageValidator.calculateSha256("test bytes".getBytes());
        assertNotNull(hash);
        assertEquals(64, hash.length());
    }
}
