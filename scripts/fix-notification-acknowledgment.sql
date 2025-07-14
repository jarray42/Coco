-- Add acknowledged_at column to notification_log table
-- This allows users to mark notifications as read/acknowledged
-- 
-- NOTIFICATION BELL FEATURE:
-- ✅ Bell shows count: Only unread notifications (acknowledged_at IS NULL) from last 24 hours
-- ✅ Click bell: Instantly marks all notifications as read (delivery_status='read', acknowledged_at=timestamp)
-- ✅ Visual feedback: Read notifications appear dimmed in history
-- ✅ Immediate response: Count drops to 0 instantly when bell is clicked
-- ✅ Database constraint: delivery_status must be 'sent', 'delivered', 'failed', or 'read'

-- First check if the column exists, then add it if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_log' 
        AND column_name = 'acknowledged_at'
    ) THEN
        ALTER TABLE notification_log 
        ADD COLUMN acknowledged_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add index for performance on acknowledged notifications
CREATE INDEX IF NOT EXISTS idx_notification_log_acknowledged 
ON notification_log(user_id, acknowledged_at) 
WHERE acknowledged_at IS NOT NULL;

-- Update RLS policy if needed (optional)
DROP POLICY IF EXISTS "Users can update their own notification acknowledgments" ON notification_log;
DROP POLICY IF EXISTS "Users can mark their own notifications as read" ON notification_log;

CREATE POLICY "Users can mark their own notifications as read" 
ON notification_log 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Grant update permission for marking notifications as read
GRANT UPDATE(acknowledged_at, delivery_status) ON notification_log TO authenticated;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notification_log' 
AND column_name = 'acknowledged_at'; 