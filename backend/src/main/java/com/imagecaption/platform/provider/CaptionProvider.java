package com.imagecaption.platform.provider;

import com.imagecaption.platform.domain.CaptionMode;

import java.io.File;

public interface CaptionProvider {
    InferenceResult generateCaption(File imageFile, CaptionMode mode);
}
