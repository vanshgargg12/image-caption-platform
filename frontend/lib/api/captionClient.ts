import { CaptionMode, CaptionRequest, ErrorResponse, FeedbackRequest, FeedbackResponse, ApiError } from '../types/caption';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: Partial<ErrorResponse> = {};
    try {
      errorData = await response.json();
    } catch {
      // Ignore JSON parse errors for non-JSON responses
    }

    const code = errorData.code || getFallbackErrorCode(response.status);
    const message = errorData.message || getFallbackErrorMessage(response.status);
    const requestId = errorData.requestId || '';

    throw new ApiError(message, code, response.status, requestId);
  }

  return response.json() as Promise<T>;
}

export function getFriendlyErrorMessage(code: string, fallbackMessage?: string): string {
  switch (code) {
    case 'CORRUPT_IMAGE':
      return 'The uploaded image appears to be corrupted, truncated, or unreadable. Please check the file and try another image.';
    case 'UNSUPPORTED_CAPTION_MODE':
      return 'The selected caption mode is not supported by the model.';
    case 'UNSUPPORTED_IMAGE_TYPE':
      return 'Only JPEG, PNG, and WebP images are supported.';
    case 'EMPTY_FILE':
      return 'The uploaded image file is empty or corrupted.';
    case 'MISSING_IMAGE_FILE':
      return 'Please choose an image file to upload.';
    case 'PAYLOAD_TOO_LARGE':
      return 'The uploaded image size exceeds the maximum limit of 10MB.';
    case 'INFERENCE_TIMEOUT':
      return 'Caption generation timed out. Please try again.';
    case 'INFERENCE_SERVICE_UNAVAILABLE':
    case 'MODEL_NOT_READY':
    case 'SERVICE_BUSY':
      return 'The caption service is currently unavailable or busy. Please try again in a few moments.';
    case 'CAPTION_GENERATION_FAILED':
      return 'The model was unable to generate a caption for this image. Please try a different image.';
    default:
      return fallbackMessage || 'An unexpected error occurred. Please try again.';
  }
}

function getFallbackErrorCode(status: number): string {
  switch (status) {
    case 400: return 'INVALID_INPUT';
    case 404: return 'CAPTION_NOT_FOUND';
    case 413: return 'PAYLOAD_TOO_LARGE';
    case 503: return 'SERVICE_UNAVAILABLE';
    case 504: return 'GATEWAY_TIMEOUT';
    default: return 'INTERNAL_SERVER_ERROR';
  }
}

function getFallbackErrorMessage(status: number): string {
  switch (status) {
    case 400: return 'The upload request was invalid or unsupported.';
    case 404: return 'The requested caption was not found.';
    case 413: return 'The uploaded image size exceeds the maximum limit.';
    case 503: return 'The caption service is currently unavailable or busy. Please try again.';
    case 504: return 'Caption generation timed out. Please try again.';
    default: return 'An unexpected server error occurred. Please try again.';
  }
}

export async function submitCaptionRequest(image: File, mode: CaptionMode = 'SHORT'): Promise<CaptionRequest> {
  const formData = new FormData();
  formData.append('image', image);
  formData.append('captionMode', mode);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/captions`, {
      method: 'POST',
      body: formData,
    });
    return await handleResponse<CaptionRequest>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to connect to backend service. Please check your network connection.', 'NETWORK_ERROR', 0);
  }
}

export async function getCaptionRequest(id: string): Promise<CaptionRequest> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/captions/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    return await handleResponse<CaptionRequest>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to retrieve caption. Please check your network connection.', 'NETWORK_ERROR', 0);
  }
}

export async function submitFeedback(id: string, feedback: FeedbackRequest): Promise<FeedbackResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/captions/${encodeURIComponent(id)}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(feedback),
    });
    return await handleResponse<FeedbackResponse>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to submit feedback. Please try again.', 'NETWORK_ERROR', 0);
  }
}
