# Admin Dashboard - Quick Setup Guide

## 🚀 5-Minute Setup

### Step 1: Configure Admin Email

Open or create `.env.local` in the project root:

```bash
# .env.local
ADMIN_EMAIL=your-email@example.com
```

Replace `your-email@example.com` with your Supabase user email.

### Step 2: Restart Development Server

```bash
# If running, stop the current server
# Then restart:
npm run dev
# or
pnpm dev
```

### Step 3: Access Admin Dashboard

1. Make sure you're logged in with your admin email
2. Navigate to: `http://localhost:3000/admin`
3. You should see the admin dashboard

## ✅ What You Can Do Now

### Feedback Management (`/admin/feedback`)
- **View All Feedback**: See every user submission in one place
- **Filter by Status**: Open, Under Review, In Progress, Completed, Closed
- **Update Status**: Track progress on bugs and features
- **Set Priority**: Mark critical issues vs low-priority requests
- **Add Comments**: Document your decisions and next steps
- **Track History**: All changes are logged in the audit table

### Expense Management (`/admin/expenses`)
- View all expenses and settlements
- Monitor financial transactions
- Track group spending

### Platform Dashboard (`/admin`)
- Key metrics and statistics
- User count
- Feedback overview
- Financial summary

## 🔧 Feedback Workflow

### How Users Submit Feedback
1. Settings → Feedback & Bug Reports
2. Choose type: Bug Report / Feature Request / Improvement
3. Select module (optional)
4. Write title and description
5. Click Submit

### How You Manage It
1. Go to `/admin/feedback`
2. See all submissions in status tabs
3. Click eye icon to view details
4. Update status and priority
5. Add admin comment (optional)
6. Click "Save Changes"
7. Users see the update in their history

## 📊 Key Features

### Admin-Only Access
- ✅ Only email matching `NEXT_PUBLIC_ADMIN_EMAIL` can access `/admin`
- ✅ Completely separate from main app
- ✅ Not visible in user navigation menus
- ✅ Protected by authentication

### Feedback Statuses
- **Open**: Just submitted, needs review
- **Under Review**: You're looking at it
- **In Progress**: Being worked on
- **Completed**: Fixed/implemented
- **Closed**: Won't be implemented

### Priority Levels
- **Low**: Nice to have, not urgent
- **Medium**: Standard priority
- **High**: Important feature
- **Critical**: Blocking issue, needs immediate attention

## 📁 File Structure

All admin files are in:
```
apps/web/src/
├── app/admin/                    ← Admin routes
│   ├── page.tsx                  ← Dashboard
│   ├── feedback/                 ← Feedback management
│   ├── expenses/                 ← Expense tracking
│   ├── settings/                 ← Admin settings
│   └── layout.tsx                ← Admin sidebar & layout
├── components/admin/             ← Admin components
│   ├── sidebar.tsx
│   ├── stats-overview.tsx
│   ├── feedback-manager.tsx
│   └── expenses-manager.tsx
└── lib/
    ├── supabase/admin.ts         ← Admin auth check
    └── actions/admin.ts          ← Admin server actions
```

## 🔒 Security

- Only your email can access admin panel
- All actions are logged
- RLS policies protect data
- Environment variable keeps email secure

## ❓ Troubleshooting

### "Not authorized" error?
- Check your email matches `NEXT_PUBLIC_ADMIN_EMAIL`
- Restart dev server after changing `.env.local`
- Clear browser cache/cookies

### Can't see feedback?
- Make sure migration `00024_feedback_system.sql` was applied
- Check users have submitted feedback

### Updates not saving?
- Check browser console for error messages
- Verify you're logged in as admin
- Refresh the page and try again

## 📚 Full Documentation

See `ADMIN_DASHBOARD.md` for complete documentation including:
- All available features
- API reference
- Database schema
- Advanced usage
- Future enhancements

## 🎯 Next Steps

1. ✅ Set `NEXT_PUBLIC_ADMIN_EMAIL` in `.env.local`
2. ✅ Restart dev server
3. ✅ Visit `/admin`
4. ✅ Create test feedback from user account
5. ✅ Go back to admin and update the feedback status
6. ✅ Check that users see the status update

## 🚢 Ready to Ship

Everything is production-ready and can be deployed as-is. The admin dashboard will:
- Protect itself with email authentication
- Handle errors gracefully
- Log all admin actions
- Work with your existing database

---

**Questions?** See `ADMIN_DASHBOARD.md` for detailed documentation.
