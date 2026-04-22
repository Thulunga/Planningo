'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  AlertCircle,
  Bug,
  Lightbulb,
  Loader2,
  MessageSquare,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@planningo/ui'
import { submitFeedback, getUserFeedback, deleteFeedback } from '@/lib/actions/feedback'

interface FeedbackItem {
  id: string
  type: 'bug_report' | 'feature_request' | 'improvement'
  title: string
  description: string
  module?: string
  status: 'open' | 'under_review' | 'in_progress' | 'completed' | 'closed'
  priority?: string
  created_at: string
  updated_at: string
}

const MODULES = [
  { label: 'Dashboard', value: 'dashboard' },
  { label: 'Expenses', value: 'expenses' },
  { label: 'Todos', value: 'todos' },
  { label: 'Calendar', value: 'calendar' },
  { label: 'Trading', value: 'trading' },
  { label: 'Reminders', value: 'reminders' },
  { label: 'Settings', value: 'settings' },
  { label: 'General', value: 'general' },
]

export default function FeedbackClient() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null)

  const [formData, setFormData] = useState({
    type: 'bug_report' as const,
    title: '',
    description: '',
    module: 'general',
  })

  useEffect(() => {
    loadFeedback()
  }, [])

  async function loadFeedback() {
    try {
      setIsLoading(true)
      const result = await getUserFeedback()
      if (result.success) {
        setFeedback(result.feedback)
      } else {
        toast.error('Failed to load feedback')
      }
    } catch (error) {
      toast.error('Error loading feedback')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setIsSubmitting(true)
      const result = await submitFeedback(formData)

      if (result.success) {
        toast.success('Thank you! Your feedback has been submitted.')
        setFormData({
          type: 'bug_report',
          title: '',
          description: '',
          module: 'general',
        })
        await loadFeedback()
      } else {
        toast.error(result.error || 'Failed to submit feedback')
      }
    } catch (error) {
      toast.error('Error submitting feedback')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return

    try {
      const result = await deleteFeedback(id)
      if (result.success) {
        toast.success('Feedback deleted')
        await loadFeedback()
      } else {
        toast.error(result.error || 'Failed to delete feedback')
      }
    } catch (error) {
      toast.error('Error deleting feedback')
      console.error(error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'in_progress':
        return <Clock className="h-4 w-4" />
      case 'closed':
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'closed':
        return 'bg-red-100 text-red-800'
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug_report':
        return <Bug className="h-4 w-4" />
      case 'feature_request':
        return <Lightbulb className="h-4 w-4" />
      case 'improvement':
        return <MessageSquare className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'bug_report':
        return 'Bug Report'
      case 'feature_request':
        return 'Feature Request'
      case 'improvement':
        return 'Improvement'
      default:
        return type
    }
  }

  const bugReports = feedback.filter((f) => f.type === 'bug_report')
  const featureRequests = feedback.filter((f) => f.type === 'feature_request')
  const improvements = feedback.filter((f) => f.type === 'improvement')

  return (
    <div className="space-y-8">
      {/* Submission Form */}
      <Card>
        <CardHeader>
          <CardTitle>Submit Feedback</CardTitle>
          <CardDescription>Help us improve Planningo by sharing your thoughts</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Feedback Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as any })}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug_report">
                      <span className="flex items-center gap-2">
                        <Bug className="h-4 w-4" />
                        Bug Report
                      </span>
                    </SelectItem>
                    <SelectItem value="feature_request">
                      <span className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Feature Request
                      </span>
                    </SelectItem>
                    <SelectItem value="improvement">
                      <span className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Improvement Idea
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="module">Module (Optional)</Label>
                <Select value={formData.module} onValueChange={(value) => setFormData({ ...formData, module: value })}>
                  <SelectTrigger id="module">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Brief title of your feedback"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Please provide detailed information about your feedback. Include steps to reproduce for bugs, or expected behavior for feature requests."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={isSubmitting}
                rows={6}
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Feedback History</CardTitle>
          <CardDescription>Track the status of your submissions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : feedback.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No feedback submitted yet. Share your thoughts above!</p>
            </div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All ({feedback.length})</TabsTrigger>
                <TabsTrigger value="bugs">Bugs ({bugReports.length})</TabsTrigger>
                <TabsTrigger value="features">Features ({featureRequests.length})</TabsTrigger>
                <TabsTrigger value="improvements">Ideas ({improvements.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3">
                {feedback.map((item) => (
                  <FeedbackCard
                    key={item.id}
                    item={item}
                    onDelete={handleDelete}
                    onView={setSelectedFeedback}
                    getTypeIcon={getTypeIcon}
                    getTypeLabel={getTypeLabel}
                    getStatusIcon={getStatusIcon}
                    getStatusColor={getStatusColor}
                  />
                ))}
              </TabsContent>

              <TabsContent value="bugs" className="space-y-3">
                {bugReports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No bug reports</div>
                ) : (
                  bugReports.map((item) => (
                    <FeedbackCard
                      key={item.id}
                      item={item}
                      onDelete={handleDelete}
                      onView={setSelectedFeedback}
                      getTypeIcon={getTypeIcon}
                      getTypeLabel={getTypeLabel}
                      getStatusIcon={getStatusIcon}
                      getStatusColor={getStatusColor}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="features" className="space-y-3">
                {featureRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No feature requests</div>
                ) : (
                  featureRequests.map((item) => (
                    <FeedbackCard
                      key={item.id}
                      item={item}
                      onDelete={handleDelete}
                      onView={setSelectedFeedback}
                      getTypeIcon={getTypeIcon}
                      getTypeLabel={getTypeLabel}
                      getStatusIcon={getStatusIcon}
                      getStatusColor={getStatusColor}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="improvements" className="space-y-3">
                {improvements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No improvement ideas</div>
                ) : (
                  improvements.map((item) => (
                    <FeedbackCard
                      key={item.id}
                      item={item}
                      onDelete={handleDelete}
                      onView={setSelectedFeedback}
                      getTypeIcon={getTypeIcon}
                      getTypeLabel={getTypeLabel}
                      getStatusIcon={getStatusIcon}
                      getStatusColor={getStatusColor}
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent>
          {selectedFeedback && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getTypeIcon(selectedFeedback.type)}
                  {selectedFeedback.title}
                </DialogTitle>
                <DialogDescription>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{getTypeLabel(selectedFeedback.type)}</Badge>
                      <Badge className={getStatusColor(selectedFeedback.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(selectedFeedback.status)}
                          {selectedFeedback.status}
                        </span>
                      </Badge>
                      {selectedFeedback.module && <Badge variant="secondary">{selectedFeedback.module}</Badge>}
                    </div>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedFeedback.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="font-medium">{new Date(selectedFeedback.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Updated</p>
                    <p className="font-medium">{new Date(selectedFeedback.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    handleDelete(selectedFeedback.id)
                    setSelectedFeedback(null)
                  }}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Feedback
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FeedbackCard({
  item,
  onDelete,
  onView,
  getTypeIcon,
  getTypeLabel,
  getStatusIcon,
  getStatusColor,
}: {
  item: FeedbackItem
  onDelete: (id: string) => Promise<void>
  onView: (item: FeedbackItem) => void
  getTypeIcon: (type: string) => React.ReactNode
  getTypeLabel: (type: string) => string
  getStatusIcon: (status: string) => React.ReactNode
  getStatusColor: (status: string) => string
}) {
  return (
    <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {getTypeIcon(item.type)}
            <h4 className="font-medium truncate">{item.title}</h4>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {getTypeLabel(item.type)}
            </Badge>
            <Badge className={`${getStatusColor(item.status)} text-xs flex items-center gap-1`}>
              {getStatusIcon(item.status)}
              {item.status}
            </Badge>
            {item.module && (
              <Badge variant="secondary" className="text-xs">
                {item.module}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(item.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="ghost" onClick={() => onView(item)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(item.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  )
}
