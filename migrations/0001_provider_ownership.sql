-- Additive schema preparation only. This does not replace MemoryStorage.
-- Run against an independently recoverable database only after reviewing the
-- complete baseline schema and deploying a durable storage implementation.
ALTER TABLE providers ADD COLUMN IF NOT EXISTS owner_user_id varchar REFERENCES users(id);
CREATE INDEX IF NOT EXISTS providers_owner_user_id_idx ON providers(owner_user_id);
-- Existing rows stay unowned. Do not infer ownership from email or sample IDs.
