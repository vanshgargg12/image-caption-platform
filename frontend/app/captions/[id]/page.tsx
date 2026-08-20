'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import CaptionResultCard from '../../../components/CaptionResultCard';
import { getCaptionRequest } from '../../../lib/api/captionClient';
import { ApiError } from '../../../lib/types/caption';

export default function CaptionDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const {
    data: captionRequest,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['caption', id],
    queryFn: () => getCaptionRequest(id),
    enabled: Boolean(id),
  });

  if (loading) {
    return (
      <div className="p-8 text-center space-y-3" role="status">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Loading caption details...</p>
      </div>
    );
  }

  if (error) {
    const apiErr =
      error instanceof ApiError
        ? error
        : new ApiError(error instanceof Error ? error.message : 'Failed to load caption request.', 'FETCH_ERROR', 500);

    return (
      <div role="alert" className="max-w-xl mx-auto p-6 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-lg space-y-3">
        <h3 className="text-base font-bold text-red-900 dark:text-red-200">Unable to Load Caption</h3>
        <p className="text-sm text-red-800 dark:text-red-300">{apiErr.message}</p>
        <p className="text-xs text-red-700 dark:text-red-400">Error Code: {apiErr.code}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!captionRequest) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center">Caption Request Overview</h1>
      <CaptionResultCard captionRequest={captionRequest} onRetry={() => refetch()} />
    </div>
  );
}
