'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Bug,
  Lightbulb,
  MessageSquare,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Save,
} from 'lucide-react'
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@planningo/ui'
import { getAllFeedback, adminUpdateFeedbackStatus } from '@/lib/actions/admin'

interface FeedbackItem {
  id: string
  user_id: string
  type: 'bug_report' | 'feature_request' | 'improvement'
  title: string
  description: string
  module?: string
  status: 'open' | 'under_review' | 'in_progress' | 'completed' | 'closed'
  priority?: string
  created_at: string
  updated_at: string
  created_by_email: string
}

export default function AdminFeedbackManager() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateStatus, setUpdateStatus] = useState('')
  const [updatePriority, setUpdatePriority] = useState('')
  const [updateComment, setUpdateComment] = useState('')

  useEffect(() => {
    loadFeedback()
  }, [])

  async function loadFeedback() {
    try {
      setIsLoading(true)
      const result = await getAllFeedback()
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

  async function handleUpdateStatus() {
    if (!selectedFeedback) return

    try {
      setIsUpdating(true)
      const result = await adminUpdateFeedbackStatus(
        selectedFeedback.id,
        updateStatus || selectedFeedback.status,
        updatePriority || selectedFeedback.priority,
        updateComment
      )

      if (result.success) {
        toast.success('Feedback updated successfully')
        setSelectedFeedback(null)
        setUpdateStatus('')
        setUpdatePriority('')
        setUpdateComment('')
        await loadFeedback()
      } else {
        toast.error(result.error || 'Failed to update feedback')
      }
    } catch (error) {
      toast.error('Error updating feedback')
      console.error(error)
    } finally {
      setIsUpdating(false)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'in_progress':
        return <Clock className="h-4 w-4" />
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

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-blue-100 text-blue-800'
      case 'low':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const openFeedback = feedback.filter((f) => f.status === 'open')
  const underReviewFeedback = feedback.filter((f) => f.status === 'under_review')
  const inProgressFeedback = feedback.filter((f) => f.status === 'in_progress')
  const completedFeedback = feedback.filter((f) => f.status === 'completed')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Feedback Management</CardTitle>
          <CardDescription>Review and manage all user feedback submissions</CardDescription>
        </CardHeader>
        <CardContent>
          {feedback.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No feedback submitted yet</div>
          ) : (
            <Tabs defaultValue="open" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="open">Open ({openFeedback.length})</TabsTrigger>
                <TabsTrigger value="review">Review ({underReviewFeedback.length})</TabsTrigger>
                <TabsTrigger value="progress">Progress ({inProgressFeedback.length})</TabsTrigger>
                <TabsTrigger value="completed">Done ({completedFeedback.length})</TabsTrigger>
                <TabsTrigger value="all">All ({feedback.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="open" className="space-y-3 mt-4">
                {openFeedback.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No open feedback</div>
                ) : (
                  openFeedback.map((item) => (
                    <FeedbackCard
                      key={item.id}
                      item={item}
                      onView={setSelectedFeedback}
                      getTypeIcon={getTypeIcon}
                      getTypeLabel={getTypeLabel}
                      getStatusIcon={getStatusIcon}
                      getStatusColor={getStatusColor}
                      getPriorityColor={getPriorityColor}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="review" className="space-y-3 mt-4">
                {underReviewFeedback.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No feedback under review</div>
                ) : (
                  underReviewFeedback.map((item) => (
                    <FeedbackCard
                      key={item.id}
                      item={item}
                      onView={setSelectedFeedback}
                      getTypeIcon={getTypeIcon}
                      getTypeLabel={getTypeLabel}
                      getStatusIcon={getStatusIcon}
                      getStatusColor={getStatusColor}
                      getPriorityColor={getPriorityColor}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="progress" className="space-y-3 mt-4">
                {inProgressFeedback.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No feedback in progress</div>
                ) : (
                  inProgressFeedback.map((item) => (
                    <FeedbackCard
                      key={item.id}
                      item={item}
                      onView={setSelectedFeedback}
                      getTypeIcon={getTypeIcon}
                      getTypeLabel={getTypeLabel}
                      getStatusIcon={getStatusIcon}
                      getStatusColor={getStatusColor}
                      getPriorityColor={getPriorityColor}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="completed" className="space-y-3 mt-4">
                {completedFeedback.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No completed feedback</div>
                ) : (
                  completedFeedback.map((item) => (
                    <FeedbackCard
                      key={item.id}
                      item={item}
                      onView={setSelectedFeedback}
                      getTypeIcon={getTypeIcon}
                      getTypeLabel={getTypeLabel}
                      getStatusIcon={getStatusIcon}
                      getStatusColor={getStatusColor}
                      getPriorityColor={getPriorityColor}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="all" className="space-y-3 mt-4">
                {feedback.map((item) => (
                  <FeedbackCard
                    key={item.id}
                    item={item}
                    onView={setSelectedFeedback}
                    getTypeIcon={getTypeIcon}
                    getTypeLabel={getTypeLabel}
                    getStatusIcon={getStatusIcon}
                    getStatusColor={getStatusColor}
                    getPriorityColor={getPriorityColor}
                  />
                ))}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Update Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedFeedback && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getTypeIcon(selectedFeedback.type)}
                  {selectedFeedback.title}
                </DialogTitle>
                <DialogDescription>From: {selectedFeedback.created_by_email}</DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Feedback Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{getTypeLabel(selectedFeedback.type)}</Badge>
                    <Badge className={getStatusColor(selectedFeedback.status)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(selectedFeedback.status)}
                        {selectedFeedback.status}
                      </span>
                    </Badge>
                    {selectedFeedback.priority && (
                      <Badge className={getPriorityColor(selectedFeedback.priority)}>
                        Priority: {selectedFeedback.priority}
                      </Badge>
                    )}
                    {selectedFeedback.module && <Badge variant="secondary">{selectedFeedback.module}</Badge>}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded">
                      {selectedFeedback.description}
                    </p>
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
                </div>

                {/* Update Form */}
                <div className="border-t pt-6 space-y-4">
                  <h4 className="font-medium">Update Feedback</h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <Select
                        value={updateStatus || selectedFeedback.status}
                        onValueChange={setUpdateStatus}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="under_review">Under Review</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Priority</label>
                      <Select
                        value={updatePriority || selectedFeedback.priority || 'medium'}
                        onValueChange={setUpdatePriority}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Admin Comment</label>
                    <Textarea
                      placeholder="Add a note about the update (optional)"
                      value={updateComment}
                      onChange={(e) => setUpdateComment(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedFeedback(null)}
                      disabled={isUpdating}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateStatus} disabled={isUpdating}>
                      {isUpdating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
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
  onView,
  getTypeIcon,
  getTypeLabel,
  getStatusIcon,
  getStatusColor,
  getPriorityColor,
}: {
  item: FeedbackItem
  onView: (item: FeedbackItem) => void
  getTypeIcon: (type: string) => React.ReactNode
  getTypeLabel: (type: string) => string
  getStatusIcon: (status: string) => React.ReactNode
  getStatusColor: (status: string) => string
  getPriorityColor: (priority?: string) => string
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
            {item.priority && (
              <Badge className={`${getPriorityColor(item.priority)} text-xs`}>{item.priority}</Badge>
            )}
            {item.module && (
              <Badge variant="secondary" className="text-xs">
                {item.module}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(item.created_at).toLocaleDateString()}
            </span>
            <span className="text-xs text-muted-foreground">{item.created_by_email}</span>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => onView(item)}>
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
