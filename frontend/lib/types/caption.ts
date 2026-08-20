export type CaptionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type CaptionMode = 'SHORT' | 'DETAILED';

export type FeedbackRating = 'POSITIVE' | 'NEGATIVE';

export interface CaptionRequest {
  id: string;
  status: CaptionStatus;
  originalFilename: string;
  imageHash: string;
  captionMode: CaptionMode;
  modelName: string;
  modelVersion: string;
  generatedCaption: string | null;
  editedCaption: string | null;
  inferenceTimeMs: number | null;
  createdAt: string;
  completedAt: string | null;
  errorCode: string | null;
}

export interface FeedbackRequest {
  rating: FeedbackRating;
  missingInformation?: string | null;
  incorrectInformation?: string | null;
  userComment?: string | null;
}

export interface FeedbackResponse {
  id: string;
  captionRequestId: string;
  rating: FeedbackRating;
  missingInformation: string | null;
  incorrectInformation: string | null;
  userComment: string | null;
  createdAt: string;
}

export interface ErrorResponse {
  timestamp: string;
  requestId: string;
  code: string;
  message: string;
  details: unknown;
}

export class ApiError extends Error {
  code: string;
  status: number;
  requestId: string;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', status: number = 500, requestId: string = '') {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}
