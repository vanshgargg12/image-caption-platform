import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CaptionResultCard from '../components/CaptionResultCard';
import { CaptionRequest } from '../lib/types/caption';
import * as api from '../lib/api/captionClient';

vi.mock('../lib/api/captionClient', () => ({
  submitFeedback: vi.fn(),
}));

describe('CaptionResultCard Component', () => {
  const mockCompletedRequest: CaptionRequest = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    status: 'COMPLETED',
    originalFilename: 'dog.jpg',
    imageHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    captionMode: 'SHORT',
    modelName: 'Xenova/vit-gpt2-image-captioning',
    modelVersion: 'main',
    generatedCaption: 'a dog running across a green field',
    editedCaption: null,
    inferenceTimeMs: 250,
    createdAt: '2026-08-19T20:00:00.000Z',
    completedAt: '2026-08-19T20:00:01.000Z',
    errorCode: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders caption details, model name, and inference time', () => {
    render(<CaptionResultCard captionRequest={mockCompletedRequest} />);

    expect(screen.getByDisplayValue('a dog running across a green field')).toBeInTheDocument();
    expect(screen.getByText('Xenova/vit-gpt2-image-captioning')).toBeInTheDocument();
    expect(screen.getByText('250 ms')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
  });

  it('allows editing the caption text locally', () => {
    render(<CaptionResultCard captionRequest={mockCompletedRequest} />);

    const textarea = screen.getByLabelText(/Caption Text \(Edit Locally\)/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'a golden retriever running across a grassy park' } });

    expect(textarea.value).toBe('a golden retriever running across a grassy park');
  });

  it('copies caption text to clipboard when copy button is clicked', async () => {
    render(<CaptionResultCard captionRequest={mockCompletedRequest} />);

    const copyBtn = screen.getByRole('button', { name: /Copy Caption/i });
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('a dog running across a green field');
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/Caption copied to clipboard/i);
    });
  });

  it('submits positive feedback when rating button and submit are clicked', async () => {
    vi.mocked(api.submitFeedback).mockResolvedValue({
      id: 'fb-123',
      captionRequestId: mockCompletedRequest.id,
      rating: 'POSITIVE',
      missingInformation: null,
      incorrectInformation: null,
      userComment: 'Great caption!',
      createdAt: '2026-08-19T20:05:00.000Z',
    });

    render(<CaptionResultCard captionRequest={mockCompletedRequest} />);

    const posRatingBtn = screen.getByRole('button', { name: /Positive Feedback/i });
    fireEvent.click(posRatingBtn);

    const submitBtn = screen.getByRole('button', { name: /Submit Feedback/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.submitFeedback).toHaveBeenCalledWith(
        mockCompletedRequest.id,
        expect.objectContaining({ rating: 'POSITIVE' })
      );
      expect(screen.getByRole('status')).toHaveTextContent(/Thank you! Your feedback has been recorded/i);
    });
  });
});
