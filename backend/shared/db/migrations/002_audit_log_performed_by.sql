-- Migration 002: Add performed_by column to ai_audit_log
-- Tracks which user triggered each audited change (sourced from JWT sub/username)
ALTER TABLE ai_audit_log
  ADD COLUMN IF NOT EXISTS performed_by TEXT;
