# Feedback & Bug Report System

## Overview

A comprehensive feedback management system has been added to Planningo that allows users to submit bug reports, feature requests, and improvement ideas. The system is visible throughout the app in the Settings section and provides a centralized way for you to track and manage user feedback.

## Features

### User-Facing Features
- **Submit Feedback**: Users can submit three types of feedback:
  - Bug Reports (with bug icon)
  - Feature Requests (with lightbulb icon)
  - Improvement Ideas (with message icon)

- **Module Selection**: Users can categorize their feedback by module:
  - Dashboard
  - Expenses
  - Todos
  - Calendar
  - Trading
  - Reminders
  - Settings
  - General

- **Feedback History**: Users can view all their submitted feedback organized by type
- **Status Tracking**: Each feedback item shows its current status:
  - Open (initial state)
  - Under Review
  - In Progress
  - Completed
  - Closed

- **Delete Feedback**: Users can delete their own feedback submissions

### Admin/Reviewer Features
- View all feedback submitted by all users
- Update feedback status and add comments
- Track feedback changes in the audit log

## Database Schema

### `feedback` Table
- `id` (UUID): Primary key
- `user_id` (UUID): References the user who submitted feedback
- `type` (VARCHAR): 'bug_report', 'feature_request', or 'improvement'
- `title` (VARCHAR): Brief title (max 255 chars)
- `description` (TEXT): Detailed description (max 5000 chars)
- `module` (VARCHAR): Optional categorization
- `status` (VARCHAR): 'open', 'under_review', 'in_progress', 'completed', 'closed'
- `priority` (VARCHAR): 'low', 'medium', 'high', 'critical' (for admin use)
- `created_at` (TIMESTAMP): When feedback was submitted
- `updated_at` (TIMESTAMP): Last update time
- `created_by_email` (VARCHAR): Email of the user who submitted

### `feedback_updates` Table (Audit Log)
- `id` (UUID): Primary key
- `feedback_id` (UUID): Reference to feedback item
- `user_id` (UUID): Admin/reviewer who made the update
- `old_status` (VARCHAR): Previous status
- `new_status` (VARCHAR): New status
- `comment` (TEXT): Update notes
- `created_at` (TIMESTAMP): When update was made

## File Structure

### Backend
- **Database Migration**: `packages/database/supabase/migrations/00024_feedback_system.sql`
  - Creates `feedback` and `feedback_updates` tables
  - Configures RLS policies
  - Creates indexes for performance

- **Server Actions**: `apps/web/src/lib/actions/feedback.ts`
  - `submitFeedback()`: Submit new feedback
  - `getFeedback()`: Get all feedback (admin)
  - `getUserFeedback()`: Get user's own feedback
  - `updateFeedbackStatus()`: Update status (admin)
  - `deleteFeedback()`: Delete feedback
  - `getFeedbackStats()`: Get statistics

### Frontend
- **Feedback Page**: `apps/web/src/app/(dashboard)/settings/feedback/page.tsx`
  - Server-rendered page with back button

- **Feedback Client Component**: `apps/web/src/components/settings/feedback-client.tsx`
  - Feedback submission form
  - Feedback history with filtering by type
  - View details dialog
  - Delete functionality
  - Real-time status display

- **Settings Update**: `apps/web/src/app/(dashboard)/settings/page.tsx`
  - Added "Feedback & Bug Reports" section to settings menu

## How to Use

### For Users

1. **Navigate to Feedback**:
   - Go to Settings → Feedback & Bug Reports

2. **Submit Feedback**:
   - Select feedback type (Bug Report, Feature Request, or Improvement)
   - Choose applicable module (optional)
   - Enter a clear title (min 5 characters)
   - Provide detailed description (min 20 characters)
   - Click "Submit Feedback"

3. **Track Feedback**:
   - View all submissions in the "Your Feedback History" section
   - Filter by type using tabs (All, Bugs, Features, Ideas)
   - Click the eye icon to view full details
   - Click the trash icon to delete your feedback

### For Administrators

To manage and review feedback, you can query the Supabase database directly:

```sql
-- View all feedback
SELECT * FROM feedback ORDER BY created_at DESC;

-- View feedback by status
SELECT * FROM feedback WHERE status = 'open' ORDER BY created_at DESC;

-- View feedback by type
SELECT * FROM feedback WHERE type = 'bug_report' ORDER BY created_at DESC;

-- Update feedback status
UPDATE feedback
SET status = 'in_progress', updated_at = NOW()
WHERE id = 'feedback-uuid';

-- View feedback updates/comments
SELECT * FROM feedback_updates WHERE feedback_id = 'feedback-uuid';

-- Get statistics
SELECT type, status, COUNT(*) as count
FROM feedback
GROUP BY type, status;
```

## RLS (Row-Level Security) Policies

The feedback system uses Supabase RLS to ensure:
- **All authenticated users** can read all feedback (transparency)
- **Users** can only create their own feedback
- **Users** can only update/delete their own feedback
- **Audit logs** are only visible to users whose own feedback is being tracked

## Deployment

### Prerequisites
- Supabase project setup
- Next.js web app running

### Steps

1. **Apply Database Migration**:
   ```bash
   # Using Supabase CLI
   supabase migration up
   
   # Or manually in Supabase SQL Editor:
   # Copy and run the SQL from packages/database/supabase/migrations/00024_feedback_system.sql
   ```

2. **Verify Installation**:
   ```sql
   -- Check if tables exist
   SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('feedback', 'feedback_updates');
   
   -- Check RLS policies
   SELECT * FROM pg_policies WHERE tablename IN ('feedback', 'feedback_updates');
   ```

3. **Test the Feature**:
   - Navigate to Settings → Feedback & Bug Reports
   - Submit a test feedback item
   - Verify it appears in the history
   - Check the database to confirm data is saved

## Validation Rules

### Feedback Submission
- **Title**: Required, 5-255 characters
- **Description**: Required, 20-5000 characters
- **Type**: Required (bug_report, feature_request, improvement)
- **Module**: Optional

### Status Update (Admin)
- Valid statuses: open, under_review, in_progress, completed, closed
- Comment: Optional

## Performance Optimizations

The system includes indexes on:
- `user_id` - Fast lookup of user's feedback
- `type` - Quick filtering by feedback type
- `status` - Efficient status-based queries
- `created_at` - Sorted feed performance

## Future Enhancements

Potential improvements:
1. **Admin Dashboard**: Create a dedicated admin panel to review and manage all feedback
2. **Notifications**: Send email notifications when feedback status changes
3. **Public Roadmap**: Display completed/in-progress features based on feature requests
4. **Voting System**: Allow users to upvote/support features they want
5. **Comments**: Allow discussions on feedback items
6. **Attachments**: Support file uploads for screenshots/logs
7. **Email Integration**: Send feedback summaries to admins

## Troubleshooting

### Feedback Not Saving
- Check if migration was applied: `SELECT * FROM feedback;`
- Verify RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'feedback';`
- Check browser console for errors

### Can't View Feedback
- Ensure user is authenticated
- Check RLS policies allow SELECT
- Verify user_id matches in database

### Status Update Not Working
- Only the admin/creator can update
- Check if you have UPDATE permissions
- Verify the feedback_id is correct

## Related Files

- Migration: `00024_feedback_system.sql`
- Actions: `lib/actions/feedback.ts`
- Page: `app/(dashboard)/settings/feedback/page.tsx`
- Component: `components/settings/feedback-client.tsx`
- Settings: `app/(dashboard)/settings/page.tsx`

## API Reference

### Server Actions

All server actions return: `{ success: boolean; error?: string; [data]?: any }`

```typescript
// Submit feedback
submitFeedback(data: {
  type: 'bug_report' | 'feature_request' | 'improvement'
  title: string
  description: string
  module?: string
})

// Get user's feedback
getUserFeedback()

// Get all feedback (admin only via RLS)
getFeedback()

// Update status
updateFeedbackStatus(feedbackId: string, data: {
  status: 'open' | 'under_review' | 'in_progress' | 'completed' | 'closed'
  comment?: string
})

// Delete feedback
deleteFeedback(feedbackId: string)

// Get statistics
getFeedbackStats()
```

---

**Last Updated**: 2026-04-22
**Status**: Production Ready
