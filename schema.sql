-- MW / Measurement Wallet D1 schema
-- Production schema for campaigns, secure organizer ownership, and submissions.

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  organization TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  deadline TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('OPEN', 'CLOSED')),
  fields_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  share_token TEXT NOT NULL UNIQUE,
  context TEXT NOT NULL CHECK (context IN ('BUSINESS', 'FAMILY', 'TEAM', 'EVENT', 'OTHER')),
  admin_token TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_campaigns_share_token ON campaigns(share_token);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  values_json TEXT NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_submissions_campaign_id ON submissions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at);
