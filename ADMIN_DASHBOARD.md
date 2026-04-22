# Admin Dashboard System

## Overview

A comprehensive admin dashboard has been created for managing all platform tasks including feedback, expenses, and system monitoring. This dashboard is **completely separate** from the main application and only accessible to the configured admin user.

## Features

### 🔐 Security
- Email-based access control via `ADMIN_EMAIL`
- All admin actions are protected and logged
- RLS (Row-Level Security) ensures data isolation
- Only the admin email can access `/admin`

### 📊 Dashboard Features

#### 1. **Main Dashboard**
- Platform overview with key statistics
- Total users, feedback counts, and financial metrics
- Quick action links to manage different sections
- System configuration information

#### 2. **Feedback Management** (`/admin/feedback`)
- View all user feedback submissions in one place
- Filter by status: Open, Under Review, In Progress, Completed, Closed
- View feedback by type: Bug Reports, Feature Requests, Improvements
- **Admin Actions**:
  - Update feedback status
  - Set priority level (Low, Medium, High, Critical)
  - Add admin comments/notes
  - Track all status changes in audit log
- Modal dialog for detailed view and updates

#### 3. **Expenses Management** (`/admin/expenses`)
- View all expenses across all groups
- Track settlement transactions
- View financial summaries
- Detailed expense and settlement information
- Statistics: Total expenses, total settlements

#### 4. **Settings** (`/admin/settings`)
- Admin configuration reference
- Database table information
- Available admin features
- Security guidelines
- API reference

## Setup & Configuration

### Step 1: Set Admin Email

Add the admin email to your `.env.local` file:

```bash
# .env.local
ADMIN_EMAIL=your-email@example.com
```

Replace `your-email@example.com` with your actual Supabase user email.

### Step 2: Access the Dashboard

Once configured:
1. Log in with your admin email account
2. Navigate to `/admin` in your browser
3. You'll see the admin dashboard if authenticated

### Step 3: Verify Access

If access is denied:
- Ensure you're logged in with the correct email
- Check that `ADMIN_EMAIL` is set correctly
- Restart your development server after adding the env variable

## File Structure

```
apps/web/src/
├── app/admin/
│   ├── layout.tsx              # Admin layout with sidebar
│   ├── page.tsx                # Main dashboard
│   ├── feedback/
│   │   └── page.tsx            # Feedback management page
│   ├── expenses/
│   │   └── page.tsx            # Expenses management page
│   └── settings/
│       └── page.tsx            # Admin settings page
├── components/admin/
│   ├── sidebar.tsx             # Navigation sidebar
│   ├── stats-overview.tsx       # Dashboard statistics
│   ├── feedback-manager.tsx     # Feedback management UI
│   └── expenses-manager.tsx     # Expenses management UI
├── lib/
│   ├── supabase/
│   │   └── admin.ts            # Admin auth utilities
│   └── actions/
│       └── admin.ts            # Admin server actions
```

## Server Actions

All admin operations are handled by server actions in `lib/actions/admin.ts`:

### Feedback Actions

```typescript
// Get all feedback
getAllFeedback(): Promise<{ success: boolean; feedback: FeedbackItem[] }>

// Get feedback by status
getFeedbackByStatus(status: string): Promise<{ success: boolean; feedback: FeedbackItem[] }>

// Update feedback (status, priority, comment)
adminUpdateFeedbackStatus(feedbackId: string, status: string, priority?: string, comment?: string): Promise<{ success: boolean }>
```

### Expense Actions

```typescript
// Get all expenses
getAllExpenses(): Promise<{ success: boolean; expenses: Expense[] }>

// Get all settlements
getAllSettlements(): Promise<{ success: boolean; settlements: Settlement[] }>

// Get platform statistics
getAdminStats(): Promise<{ success: boolean; stats: AdminStats }>
```

### Authentication

```typescript
// Check if current user is admin
isAdmin(): Promise<boolean>

// Get current user's email
getUserEmail(): Promise<string | null>
```

## User Interface Components

### Admin Sidebar
- Navigation between dashboard sections
- Quick link to main app
- Visual indication of current section

### Stats Overview
- Cards showing key metrics
- User count, feedback statistics
- Expense totals and completion rates

### Feedback Manager
- Tab-based filtering system
- Status badges with color coding
- Priority level indicators
- Modal dialog for detailed view and updates
- Inline delete/update capabilities

### Expenses Manager
- Expense listing with summaries
- Settlement tracking
- Financial overview cards
- Detailed view modals

## Workflow Examples

### Managing Feedback

1. Go to `/admin/feedback`
2. Review feedback in different status tabs
3. Click eye icon to view details
4. In modal:
   - Change status (Open → Under Review → In Progress → Completed)
   - Set priority (Low/Medium/High/Critical)
   - Add admin comment/notes
   - Click "Save Changes"
5. Status change is logged in `feedback_updates` table

### Monitoring Expenses

1. Go to `/admin/expenses`
2. View:
   - Total expenses and settlements
   - Individual expense entries
   - Settlement transactions
3. Click eye icon for detailed information
4. Track financial summaries

### Viewing Dashboard Stats

1. Go to `/admin` (main dashboard)
2. See key metrics:
   - Total platform users
   - Feedback statistics (by type and status)
   - Expense tracking
   - Completion rates

## Feedback Workflow for Users

### User Submits Feedback
1. User goes to Settings → Feedback & Bug Reports
2. Submits bug report, feature request, or improvement idea
3. Feedback is stored with status = "open"

### Admin Reviews and Updates
1. Admin goes to `/admin/feedback`
2. Sees all open feedback in "Open" tab
3. Reviews details
4. Updates status and priority
5. Adds comment if needed
6. User sees updated status in their feedback history

### Status Progression Example
- **Open** → User submitted, waiting for review
- **Under Review** → Admin is reviewing the submission
- **In Progress** → Being worked on / scheduled for implementation
- **Completed** → Feature implemented or bug fixed
- **Closed** → Not planned or cannot fix

## Database Schema

### feedback table
- `id` (UUID): Primary key
- `user_id` (UUID): Who submitted
- `type`: bug_report | feature_request | improvement
- `title` (VARCHAR): Brief title
- `description` (TEXT): Detailed description
- `module` (VARCHAR): Related feature area
- `status`: open | under_review | in_progress | completed | closed
- `priority`: low | medium | high | critical
- `created_at` (TIMESTAMP): Submission time
- `updated_at` (TIMESTAMP): Last update time
- `created_by_email` (VARCHAR): Submitter's email

### feedback_updates table (Audit Log)
- `id` (UUID): Primary key
- `feedback_id` (UUID): Which feedback was updated
- `user_id` (UUID): Which admin made update
- `old_status` (VARCHAR): Previous status
- `new_status` (VARCHAR): New status
- `comment` (TEXT): Admin notes
- `created_at` (TIMESTAMP): When update was made

## Future Enhancements

Planned features for the admin dashboard:

1. **Export Functionality**
   - Export feedback to CSV/PDF
   - Export expense reports

2. **Advanced Analytics**
   - Feedback completion graphs
   - User engagement metrics
   - Expense trend analysis

3. **Bulk Operations**
   - Bulk update feedback status
   - Bulk priority assignment
   - Batch email notifications

4. **User Management**
   - View all platform users
   - User activity tracking
   - Account management

5. **System Logs**
   - Activity audit logs
   - Error tracking
   - Performance metrics

6. **Email Notifications**
   - Notify users when feedback status changes
   - Email summaries for admin

## Security Considerations

### Current Implementation
- Email-based access control
- Environment variable protection
- RLS policies on all admin-accessed tables
- All admin actions require authentication check

### Best Practices
1. **Environment Variables**
   - Keep `.env.local` file secure
   - Never commit admin email to version control
   - Use different emails for different environments (dev/prod)

2. **Access Control**
   - Only share admin dashboard URL with authorized users
   - Change admin email if compromised
   - Monitor who has access

3. **Audit Trail**
   - All feedback updates are logged
   - Review audit logs regularly
   - Keep records for compliance

## Troubleshooting

### Can't Access Admin Dashboard

**Problem**: Getting redirected to home page
```
Check:
1. Are you logged in with the correct email?
2. Is ADMIN_EMAIL set in .env.local?
3. Does it match your Supabase user email exactly?
4. Have you restarted the dev server?
```

### Feedback Updates Not Saving

**Problem**: Status updates don't persist
```
Check:
1. Are you logged in as admin?
2. Check browser console for error messages
3. Verify RLS policies on feedback table
4. Ensure user is authenticated
```

### Can't See All Data

**Problem**: Missing feedback or expenses
```
Check:
1. RLS policies allow SELECT on all tables
2. User has proper database permissions
3. Data exists in the database
4. Try refreshing the page
```

## API Examples

### Check Admin Status (Server Component)
```typescript
import { isAdmin } from '@/lib/supabase/admin'

export default async function AdminCheck() {
  const admin = await isAdmin()
  if (!admin) redirect('/')
  
  return <AdminDashboard />
}
```

### Update Feedback (Server Action)
```typescript
'use client'

import { adminUpdateFeedbackStatus } from '@/lib/actions/admin'

async function handleUpdate() {
  const result = await adminUpdateFeedbackStatus(
    'feedback-uuid',
    'in_progress',
    'high',
    'Working on this now'
  )
  
  if (result.success) {
    toast.success('Updated successfully')
  }
}
```

## Integration with Main App

The admin dashboard is **completely separate** from the main Planningo app:
- Different URL path (`/admin` vs `/dashboard`)
- Separate sidebar and navigation
- Does not appear in main app menu
- Protected by admin email check
- Trading bot remains separate (as requested)
- Expense admin only accessible here

Users cannot accidentally access admin features - they're completely isolated.

## Support & Maintenance

### Regular Tasks
- Review open feedback daily
- Update feedback status as work progresses
- Monitor expense tracking for accuracy
- Check system statistics for issues

### Maintenance
- Keep admin email updated
- Monitor audit logs for changes
- Backup feedback data regularly
- Update documentation as features change

---

**Last Updated**: 2026-04-22  
**Status**: Production Ready  
**Admin Email Required**: Yes
