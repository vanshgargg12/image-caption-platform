package com.imagecaption.platform.provider;

import com.imagecaption.platform.domain.CaptionMode;
import com.imagecaption.platform.exception.InferenceServiceException;
import com.imagecaption.platform.exception.InvalidImageException;
import com.imagecaption.platform.exception.PayloadTooLargeException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class TransformersJsCaptionProviderTest {

    @TempDir
    File tempDir;

    private File sampleFile;

    @BeforeEach
    void setUp() throws IOException {
        sampleFile = new File(tempDir, "test.jpg");
        try (FileOutputStream fos = new FileOutputStream(sampleFile)) {
            fos.write(new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0});
        }
    }

    @Test
    void providerInitialization_success() {
        TransformersJsCaptionProvider provider = new TransformersJsCaptionProvider(
                "http://localhost:3001", 1000, 2000, 2
        );
        assertNotNull(provider);
    }
}
