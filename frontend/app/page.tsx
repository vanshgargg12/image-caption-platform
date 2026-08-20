'use client';

import React, { useState } from 'react';
import FileUploadZone from '../components/FileUploadZone';
import CaptionResultCard from '../components/CaptionResultCard';
import { CaptionMode, CaptionRequest, ApiError } from '../lib/types/caption';
import { submitCaptionRequest } from '../lib/api/captionClient';

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [captionMode, setCaptionMode] = useState<CaptionMode>('SHORT');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [result, setResult] = useState<CaptionRequest | null>(null);
  const [apiError, setApiError] = useState<ApiError | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsProcessing(true);
    setApiError(null);
    setResult(null);
    setStatusMessage('Uploading image and processing caption generation...');

    try {
      const response = await submitCaptionRequest(selectedFile, captionMode);
      setResult(response);
      setStatusMessage('Caption generation completed successfully.');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setApiError(err);
      } else {
        const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
        setApiError(new ApiError(msg, 'UNKNOWN_ERROR', 500));
      }
      setStatusMessage('Caption generation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setApiError(null);
    setStatusMessage('');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <section className="text-center space-y-3">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-gray-900 dark:text-gray-100">
          AI Image Captioning Engine
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Upload a JPEG or PNG image to generate automated descriptive text using ViT-GPT2 ONNX inference.
        </p>
      </section>

      {/* Hidden ARIA live region for screen-reader status updates */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>

      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <FileUploadZone onFileSelected={setSelectedFile} selectedFile={selectedFile} disabled={isProcessing} />

          {selectedFile && (
            <div className="space-y-4 max-w-xl mx-auto">
              <div>
                <label htmlFor="caption-mode-select" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Caption Generation Mode
                </label>
                <select
                  id="caption-mode-select"
                  value={captionMode}
                  onChange={(e) => setCaptionMode(e.target.value as CaptionMode)}
                  disabled={isProcessing}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SHORT">SHORT — Concise sentence description (Default)</option>
                  <option value="DETAILED" disabled>
                    DETAILED — Multi-sentence scene analysis (Reserved)
                  </option>
                </select>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow transition-colors disabled:opacity-50 focus:ring-4 focus:ring-blue-500/50"
                >
                  {isProcessing ? 'Generating Caption...' : 'Generate Image Caption'}
                </button>
              </div>
            </div>
          )}
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm font-medium transition-colors focus:ring-2 focus:ring-gray-500"
            >
              Upload Another Image
            </button>
          </div>
          <CaptionResultCard captionRequest={result} />
        </div>
      )}

      {/* Processing Spinner / Live Progress */}
      {isProcessing && (
        <div className="p-6 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-lg text-center space-y-3">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" role="status">
            <span className="sr-only">Processing...</span>
          </div>
          <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
            Running vision transformer inference... Please wait.
          </p>
        </div>
      )}

      {/* Structured API Error Display with Retry */}
      {apiError && (
        <div role="alert" className="p-6 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-lg space-y-3 text-red-900 dark:text-red-200">
          <h3 className="text-base font-bold">Caption Request Failed</h3>
          <p className="text-sm">{apiError.message}</p>
          <div className="text-xs text-red-700 dark:text-red-300 space-y-1">
            <p>Error Code: {apiError.code}</p>
            {apiError.requestId && <p>Request Trace ID: {apiError.requestId}</p>}
          </div>

          <div className="pt-2 flex space-x-3">
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md text-sm font-medium transition-colors focus:ring-2 focus:ring-red-500"
            >
              Retry Request
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 rounded-md text-sm font-medium transition-colors"
            >
              Cancel & Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
