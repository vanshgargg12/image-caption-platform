'use client';

import React, { useState } from 'react';
import { CaptionRequest } from '../lib/types/caption';
import FeedbackForm from './FeedbackForm';

interface CaptionResultCardProps {
  captionRequest: CaptionRequest;
  onRetry?: () => void;
}

export default function CaptionResultCard({ captionRequest, onRetry }: CaptionResultCardProps) {
  const [editedCaption, setEditedCaption] = useState(
    captionRequest.editedCaption || captionRequest.generatedCaption || ''
  );
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedCaption);
      setCopyStatus('Caption copied to clipboard!');
      setTimeout(() => setCopyStatus(null), 3000);
    } catch {
      setCopyStatus('Failed to copy to clipboard.');
      setTimeout(() => setCopyStatus(null), 3000);
    }
  };

  const handleDownloadJson = () => {
    const dataToDownload = {
      ...captionRequest,
      editedCaption: editedCaption !== captionRequest.generatedCaption ? editedCaption : captionRequest.editedCaption,
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToDownload, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `caption-${captionRequest.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Generated Image Caption</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Request ID: {captionRequest.id}</p>
        </div>
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full ${
            captionRequest.status === 'COMPLETED'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200'
              : captionRequest.status === 'FAILED'
              ? 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-200'
          }`}
        >
          {captionRequest.status}
        </span>
      </div>

      {captionRequest.status === 'COMPLETED' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="editable-caption-textarea" className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Caption Text (Edit Locally)
            </label>
            <textarea
              id="editable-caption-textarea"
              rows={3}
              value={editedCaption}
              onChange={(e) => setEditedCaption(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-base bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 font-normal"
              aria-describedby="caption-edit-hint"
            />
            <p id="caption-edit-hint" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              You can modify the caption text above before copying or downloading.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50 dark:bg-gray-900/60 p-3 rounded-md text-xs text-gray-700 dark:text-gray-300">
            <div>
              <span className="font-semibold block text-gray-500 dark:text-gray-400">Model Name</span>
              <span className="truncate block" title={captionRequest.modelName}>
                {captionRequest.modelName}
              </span>
            </div>
            <div>
              <span className="font-semibold block text-gray-500 dark:text-gray-400">Model Revision</span>
              <span>{captionRequest.modelVersion}</span>
            </div>
            <div>
              <span className="font-semibold block text-gray-500 dark:text-gray-400">Inference Time</span>
              <span>{captionRequest.inferenceTimeMs ?? 0} ms</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors focus:ring-2 focus:ring-blue-500"
            >
              Copy Caption
            </button>
            <button
              type="button"
              onClick={handleDownloadJson}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-md text-sm font-medium transition-colors focus:ring-2 focus:ring-gray-500"
            >
              Download JSON Result
            </button>
          </div>

          {copyStatus && (
            <div role="status" aria-live="polite" className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {copyStatus}
            </div>
          )}

          <hr className="border-gray-200 dark:border-gray-700 my-6" />

          <FeedbackForm captionRequestId={captionRequest.id} />
        </div>
      )}

      {captionRequest.status === 'FAILED' && (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-800 dark:text-red-200">
            <p className="font-semibold">Caption Generation Failed</p>
            <p className="mt-1">Error Code: {captionRequest.errorCode || 'UNKNOWN_ERROR'}</p>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors focus:ring-2 focus:ring-blue-500"
            >
              Retry Caption Generation
            </button>
          )}
        </div>
      )}
    </div>
  );
}
