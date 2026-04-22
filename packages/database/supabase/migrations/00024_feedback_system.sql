-- Create feedback table for feature requests and bug reports
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('bug_report', 'feature_request', 'improvement')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  module VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'in_progress', 'completed', 'closed')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by_email VARCHAR(255)
);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create index for performance
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_type ON feedback(type);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);

-- RLS Policy: Users can view all feedback (read-only)
CREATE POLICY "Enable feedback read access for all authenticated users"
ON feedback FOR SELECT
TO authenticated
USING (true);

-- RLS Policy: Users can create their own feedback
CREATE POLICY "Enable feedback creation for authenticated users"
ON feedback FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own feedback (status updates by admin/owner)
CREATE POLICY "Enable feedback update for own feedback"
ON feedback FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own feedback
CREATE POLICY "Enable feedback deletion for own feedback"
ON feedback FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create audit table for tracking feedback updates
CREATE TABLE IF NOT EXISTS feedback_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on audit table
ALTER TABLE feedback_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view updates for their own feedback
CREATE POLICY "Enable feedback_updates read access"
ON feedback_updates FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM feedback
    WHERE feedback.id = feedback_updates.feedback_id
    AND feedback.user_id = auth.uid()
  )
);

-- Create index for audit table
CREATE INDEX idx_feedback_updates_feedback_id ON feedback_updates(feedback_id);
CREATE INDEX idx_feedback_updates_created_at ON feedback_updates(created_at DESC);
