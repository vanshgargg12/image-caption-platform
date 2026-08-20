'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { submitFeedback } from '../lib/api/captionClient';

const feedbackSchema = z.object({
  rating: z.enum(['POSITIVE', 'NEGATIVE'] as const, {
    required_error: 'Please select a rating.',
  }),
  missingInformation: z.string().optional(),
  incorrectInformation: z.string().optional(),
  userComment: z.string().optional(),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

interface FeedbackFormProps {
  captionRequestId: string;
  onFeedbackSubmitted?: () => void;
}

export default function FeedbackForm({ captionRequestId, onFeedbackSubmitted }: FeedbackFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
  });

  const selectedRating = watch('rating');

  const onSubmit = async (values: FeedbackFormValues) => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await submitFeedback(captionRequestId, {
        rating: values.rating,
        missingInformation: values.missingInformation || null,
        incorrectInformation: values.incorrectInformation || null,
        userComment: values.userComment || null,
      });
      setSubmitted(true);
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit feedback. Please try again.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div role="status" className="p-4 bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-800 rounded-md text-sm text-green-800 dark:text-green-200 font-medium">
        Thank you! Your feedback has been recorded.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-gray-50 dark:bg-gray-800/60 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Submit Caption Feedback</h4>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Was this caption helpful and accurate? <span className="text-red-500">*</span>
        </label>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => setValue('rating', 'POSITIVE', { shouldValidate: true })}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
              selectedRating === 'POSITIVE'
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100'
            }`}
            aria-pressed={selectedRating === 'POSITIVE'}
          >
            Positive Feedback
          </button>
          <button
            type="button"
            onClick={() => setValue('rating', 'NEGATIVE', { shouldValidate: true })}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
              selectedRating === 'NEGATIVE'
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100'
            }`}
            aria-pressed={selectedRating === 'NEGATIVE'}
          >
            Negative Feedback
          </button>
        </div>
        {errors.rating && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
            {errors.rating.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="missing-info-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Missing Information (Optional)
        </label>
        <input
          id="missing-info-input"
          type="text"
          {...register('missingInformation')}
          placeholder="e.g. Missed the golden retriever breed"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="incorrect-info-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Incorrect / Hallucinated Details (Optional)
        </label>
        <input
          id="incorrect-info-input"
          type="text"
          {...register('incorrectInformation')}
          placeholder="e.g. It was a cat, not a dog"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="user-comment-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Additional Comments (Optional)
        </label>
        <textarea
          id="user-comment-input"
          rows={2}
          {...register('userComment')}
          placeholder="General feedback..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {errorMessage && (
        <div role="alert" className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors focus:ring-2 focus:ring-blue-500"
      >
        {submitting ? 'Submitting Feedback...' : 'Submit Feedback'}
      </button>
    </form>
  );
}
