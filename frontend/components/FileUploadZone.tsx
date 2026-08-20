'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { z } from 'zod';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const fileSchema = z.object({
  file: z
    .custom<File>((val) => val instanceof File, 'Please select an image file.')
    .refine((file) => file.size > 0, 'Selected file is empty.')
    .refine((file) => file.size <= MAX_FILE_SIZE, 'File size exceeds the 10MB maximum limit.')
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type) || /\.(jpg|jpeg|png|webp)$/i.test(file.name),
      'Only JPEG, PNG, and WebP images are supported.'
    ),
});

interface FileUploadZoneProps {
  onFileSelected: (file: File | null) => void;
  selectedFile: File | null;
  disabled?: boolean;
}

export default function FileUploadZone({ onFileSelected, selectedFile, disabled = false }: FileUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive preview URL using useMemo and revoke on cleanup
  const previewUrl = useMemo(() => {
    if (!selectedFile) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const validateAndProcessFile = useCallback(
    (file: File) => {
      setError(null);
      const validation = fileSchema.safeParse({ file });
      if (!validation.success) {
        const firstError = validation.error.errors[0]?.message || 'Invalid image file.';
        setError(firstError);
        onFileSelected(null);
        return;
      }
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const handleRemove = () => {
    setError(null);
    onFileSelected(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        id="image-upload-input"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleChange}
        disabled={disabled}
        aria-describedby={error ? 'upload-error-message' : 'upload-instructions'}
      />

      {!selectedFile ? (
        <div
          tabIndex={disabled ? -1 : 0}
          role="button"
          aria-label="Upload image dropzone. Press Space or Enter to open file dialog."
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onKeyDown={handleKeyDown}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors focus:outline-none focus:ring-4 focus:ring-blue-500/50 ${
            dragActive
              ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40'
              : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            <svg
              className="w-12 h-12 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <div id="upload-instructions" className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold text-blue-600 dark:text-blue-400">Click to choose image</span> or drag and drop here
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">JPEG, PNG, or WebP (Max 10MB)</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col items-center">
          {previewUrl && (
            <div className="relative w-full max-h-64 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-900 flex justify-center items-center mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={`Preview of selected image: ${selectedFile.name}`}
                className="max-h-64 object-contain rounded-md"
              />
            </div>
          )}
          <div className="flex items-center justify-between w-full px-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-xs" title={selectedFile.name}>
              {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
            </span>
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60 rounded-md text-sm font-medium transition-colors focus:ring-2 focus:ring-red-500"
            >
              Remove Selected Image
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          id="upload-error-message"
          role="alert"
          className="mt-3 p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-300"
        >
          <span className="font-semibold">Upload Error:</span> {error}
        </div>
      )}
    </div>
  );
}
