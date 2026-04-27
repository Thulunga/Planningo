import type { Metadata } from 'next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@planningo/ui'
import { AlertCircle, Shield, Database, Settings } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Settings - Admin',
}

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Admin Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure admin features and system settings
        </p>
      </div>

      {/* Environment Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Configuration
          </CardTitle>
          <CardDescription>
            Current admin access settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-2">Admin Email</h4>
            <div className="bg-muted p-3 rounded font-mono text-sm">
              {process.env.ADMIN_EMAIL || 'Not configured'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Only users with email matching ADMIN_EMAIL can access this dashboard
            </p>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-2">How to Configure</h4>
            <p className="text-sm text-muted-foreground">
              To set the admin email, add the following to your .env.local file:
            </p>
            <div className="bg-muted p-3 rounded font-mono text-xs mt-2">
              ADMIN_EMAIL=your-email@example.com
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Then restart your development server for changes to take effect.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Tables
          </CardTitle>
          <CardDescription>
            Core database tables used by the admin system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-2">Feedback Tables</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• <span className="font-mono">feedback</span> - User feedback submissions</li>
              <li>• <span className="font-mono">feedback_updates</span> - Admin update history</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-2">Expense Tables</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• <span className="font-mono">expenses</span> - Individual expense entries</li>
              <li>• <span className="font-mono">settlements</span> - Payment settlements</li>
              <li>• <span className="font-mono">expense_groups</span> - Group information</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Features & Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Admin Features
          </CardTitle>
          <CardDescription>
            Available admin capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm mb-1">Feedback Management</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ View all user feedback submissions</li>
                <li>✓ Filter by status, type, and priority</li>
                <li>✓ Update feedback status and priority</li>
                <li>✓ Add comments and notes</li>
                <li>✓ Track update history via audit logs</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-1">Expense Management</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ View all expenses across all groups</li>
                <li>✓ Monitor settlement transactions</li>
                <li>✓ View financial summaries</li>
                <li>✓ Track user payment details</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-1">Platform Analytics</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ View total user count</li>
                <li>✓ Track feedback statistics</li>
                <li>✓ Monitor financial metrics</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-900">
            <AlertCircle className="h-5 w-5" />
            Security Notice
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-yellow-800">
          <ul className="space-y-2">
            <li>• This admin dashboard is protected by authentication and email-based authorization</li>
            <li>• Only the configured admin email can access this dashboard</li>
            <li>• All admin actions are logged for audit purposes</li>
            <li>• Never share your admin credentials or environment variables</li>
            <li>• Keep your ADMIN_EMAIL configuration secure</li>
          </ul>
        </CardContent>
      </Card>

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Admin API Reference</CardTitle>
          <CardDescription>
            Available server actions for admin operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-mono text-sm font-medium mb-2">Feedback Actions</h4>
            <ul className="text-xs space-y-1 text-muted-foreground font-mono">
              <li>getAllFeedback()</li>
              <li>getFeedbackByStatus(status)</li>
              <li>adminUpdateFeedbackStatus(id, status, priority?, comment?)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-sm font-medium mb-2">Expense Actions</h4>
            <ul className="text-xs space-y-1 text-muted-foreground font-mono">
              <li>getAllExpenses()</li>
              <li>getAllSettlements()</li>
              <li>getAdminStats()</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            All admin actions require admin authorization and are located in <span className="font-mono">lib/actions/admin.ts</span>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
