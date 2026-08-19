package com.imagecaption.platform.exception;

public class InvalidImageException extends RuntimeException {
    private final String code;

    public InvalidImageException(String message) {
        this(message, "INVALID_IMAGE");
    }

    public InvalidImageException(String message, String code) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
