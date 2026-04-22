'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@planningo/ui'
import { joinGroupWithInviteCode, getInviteGroupInfo } from '@/lib/actions/expenses'

export default function JoinGroupPage() {
  const params = useParams()
  const router = useRouter()
  const inviteCode = params.code as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [groupInfo, setGroupInfo] = useState<any>(null)

  useEffect(() => {
    const checkAndJoin = async () => {
      try {
        // Get group info first (server action)
        const infoResult = await getInviteGroupInfo(inviteCode)

        if (infoResult.error) {
          setError(infoResult.error)
          setLoading(false)
          return
        }

        setGroupInfo(infoResult.group)

        // Attempt to join
        const result = await joinGroupWithInviteCode(inviteCode)

        if (result.error) {
          setError(result.error)
        } else {
          setSuccess(true)
          // Redirect to expenses page after 3 seconds
          setTimeout(() => {
            router.push(`/expenses/${result.groupId}`)
          }, 3000)
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (inviteCode) {
      checkAndJoin()
    }
  }, [inviteCode, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Joining Group...</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <CardTitle className="text-center">Unable to Join Group</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">{error}</p>
            <div className="flex gap-2">
              <Button onClick={() => router.push('/expenses')} className="flex-1">
                Go to Expenses
              </Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')} className="flex-1">
                Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-center">Successfully Joined!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center">
              You've successfully joined the group <strong>{groupInfo?.name}</strong>
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Redirecting you to the group...
            </p>
            <div className="flex gap-2">
              <Button onClick={() => router.push('/expenses')} className="flex-1">
                View Groups
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
