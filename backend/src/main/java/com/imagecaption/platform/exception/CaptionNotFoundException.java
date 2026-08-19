package com.imagecaption.platform.exception;

import java.util.UUID;

public class CaptionNotFoundException extends RuntimeException {
    public CaptionNotFoundException(UUID id) {
        super("Caption request not found with ID: " + id);
    }
}
