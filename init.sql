-- Initialize database with required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sentAt DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_account_lastmsg ON conversations(linkedInAccountId, lastMessageAt DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activityLogs(createdAt DESC);
