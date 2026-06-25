-- Create oracle_disputes table
CREATE TABLE oracle_disputes (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES oracle_submissions(id) ON DELETE CASCADE,
  disputer CHAR(56) NOT NULL,
  disputer_bond NUMERIC(30,7) NOT NULL,
  opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolution BOOLEAN
);

-- Index on submission_id for fast FK lookups
CREATE INDEX idx_oracle_disputes_submission_id ON oracle_disputes(submission_id);
