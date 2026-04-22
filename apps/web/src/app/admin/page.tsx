import type { Metadata } from 'next'
import AdminStatsOverview from '@/components/admin/stats-overview'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@planningo/ui'
import { AlertCircle, CheckCircle, TrendingUp } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Admin Dashboard',
}

export default async function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitor platform activity, manage feedback, and oversee expenses
        </p>
      </div>

      {/* Statistics Overview */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Platform Overview</h2>
        <AdminStatsOverview />
      </div>

      {/* Quick Actions & Info */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Navigate to sections to manage platform content
            </p>
            <ul className="text-sm space-y-2">
              <li>• Review user feedback submissions</li>
              <li>• Update feedback status & priority</li>
              <li>• Monitor expense tracking</li>
              <li>• Review settlements</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Key Features</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 bg-green-500 rounded-full" />
                Real-time feedback tracking
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 bg-green-500 rounded-full" />
                Expense management
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 bg-green-500 rounded-full" />
                Settlement tracking
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 bg-green-500 rounded-full" />
                User activity logs
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Settings</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Configure admin settings and manage the platform
            </p>
            <ul className="text-sm space-y-2">
              <li>• Configure admin email</li>
              <li>• Manage system settings</li>
              <li>• View system logs</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>How to use the admin dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">1. Feedback Management</h4>
            <p className="text-sm text-muted-foreground">
              Go to the Feedback section to review all user submissions. You can filter by status, view details, and update the status of each feedback item. Add comments to keep track of your decisions.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">2. Expenses Overview</h4>
            <p className="text-sm text-muted-foreground">
              Monitor all expense entries and settlements across groups. View total amounts, track who paid whom, and get insights into platform usage.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">3. Platform Statistics</h4>
            <p className="text-sm text-muted-foreground">
              The dashboard provides a comprehensive overview of platform metrics including user count, feedback distribution, and financial summaries.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">4. Settings & Configuration</h4>
            <p className="text-sm text-muted-foreground">
              Access admin settings to configure the platform, manage system parameters, and maintain platform integrity.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Environment Info */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Environment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <p>
              <span className="text-muted-foreground">Admin Email:</span>{' '}
              <span className="font-mono">{process.env.ADMIN_EMAIL || 'Not configured'}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Admin access is controlled by the ADMIN_EMAIL environment variable. Only the email matching this variable can access the admin dashboard.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
