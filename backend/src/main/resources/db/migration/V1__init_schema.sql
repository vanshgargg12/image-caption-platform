CREATE TABLE caption_requests (
    id UUID PRIMARY KEY,
    status VARCHAR(32) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    image_hash VARCHAR(64) NOT NULL,
    caption_mode VARCHAR(32) NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    model_version VARCHAR(255) NOT NULL,
    generated_caption TEXT,
    edited_caption TEXT,
    inference_time_ms BIGINT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_code VARCHAR(64),
    CONSTRAINT chk_caption_status CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    CONSTRAINT chk_caption_mode CHECK (caption_mode IN ('SHORT', 'DETAILED'))
);

CREATE INDEX idx_caption_requests_created_at ON caption_requests(created_at);

CREATE TABLE feedback (
    id UUID PRIMARY KEY,
    caption_request_id UUID NOT NULL,
    rating VARCHAR(32) NOT NULL,
    missing_information TEXT,
    incorrect_information TEXT,
    user_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_feedback_caption_request FOREIGN KEY (caption_request_id) REFERENCES caption_requests(id) ON DELETE CASCADE,
    CONSTRAINT chk_feedback_rating CHECK (rating IN ('POSITIVE', 'NEGATIVE'))
);

CREATE INDEX idx_feedback_caption_request_id ON feedback(caption_request_id);
