package com.imagecaption.platform.util;

import com.imagecaption.platform.exception.InvalidImageException;
import com.imagecaption.platform.exception.PayloadTooLargeException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ImageValidatorTest {

    private static final byte[] VALID_JPEG = createRealJpeg();
    private static final byte[] VALID_PNG = createRealPng();
    private static final byte[] VALID_WEBP = new byte[]{
            82, 73, 70, 70, 50, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 32, 38, 0, 0, 0,
            (byte) 208, 2, 0, (byte) 157, 1, 42, 32, 0, 32, 0, 62, 109, 52, (byte) 150, 71,
            (byte) 164, 35, 34, 33, 40, 8, 0, (byte) 128, 13, (byte) 137, 105, 0, 0, 61,
            (byte) 163, (byte) 160, 0, (byte) 254, (byte) 251, (byte) 156, (byte) 192, 0, 0
    };
    private static final byte[] INVALID_TEXT = "plain text not an image".getBytes();

    private static byte[] createRealJpeg() {
        try {
            BufferedImage img = new BufferedImage(32, 32, BufferedImage.TYPE_INT_RGB);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(img, "jpg", baos);
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    private static byte[] createRealPng() {
        try {
            BufferedImage img = new BufferedImage(32, 32, BufferedImage.TYPE_INT_ARGB);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(img, "png", baos);
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

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
    void validateImageFile_validWebpPasses() {
        MockMultipartFile file = new MockMultipartFile("image", "animation.webp", "image/webp", VALID_WEBP);
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
    void validateImageFile_truncatedHeaderThrowsException() {
        MockMultipartFile truncatedFile = new MockMultipartFile("image", "truncated.jpg", "image/jpeg", new byte[]{(byte) 0xFF, (byte) 0xD8});
        InvalidImageException ex = assertThrows(InvalidImageException.class,
                () -> ImageValidator.validateImageFile(truncatedFile, 10 * 1024 * 1024));
        assertEquals("EMPTY_FILE", ex.getCode());
    }

    @Test
    void validateImageFile_wavAsWebpThrowsException() {
        byte[] wavBytes = new byte[]{'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'A', 'V', 'E', 0, 0};
        MockMultipartFile wavFile = new MockMultipartFile("image", "audio.webp", "image/webp", wavBytes);
        InvalidImageException ex = assertThrows(InvalidImageException.class,
                () -> ImageValidator.validateImageFile(wavFile, 10 * 1024 * 1024));
        assertEquals("UNSUPPORTED_IMAGE_TYPE", ex.getCode());
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

    @Test
    void getFileExtension_resolvesExtensionFromFilenameOrHeader() {
        assertEquals(".jpg", ImageValidator.getFileExtension("image.jpg", null));
        assertEquals(".png", ImageValidator.getFileExtension("graphic.png", null));
        assertEquals(".webp", ImageValidator.getFileExtension("picture.webp", null));
        assertEquals(".png", ImageValidator.getFileExtension("unknown.tmp", VALID_PNG));
        assertEquals(".jpg", ImageValidator.getFileExtension("unknown.tmp", VALID_JPEG));
        assertEquals(".webp", ImageValidator.getFileExtension("unknown.tmp", VALID_WEBP));

        byte[] wavBytes = new byte[]{'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'A', 'V', 'E', 0, 0};
        assertEquals(".jpg", ImageValidator.getFileExtension("unknown.tmp", wavBytes));
    }
}
