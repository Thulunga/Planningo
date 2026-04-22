import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface SendInviteEmailParams {
  to: string
  groupName: string
  inviteLink: string
  inviteCode: string
  senderName?: string
}

export async function sendGroupInviteEmail({
  to,
  groupName,
  inviteLink,
  inviteCode,
  senderName = 'Someone',
}: SendInviteEmailParams) {
  try {
    const result = await resend.emails.send({
      from: 'noreply@planningo.com', // Update with your domain
      to,
      subject: `${senderName} invited you to join "${groupName}" expense group`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
          </div>
          
          <div style="padding: 40px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
              <strong>${senderName}</strong> has invited you to join the expense group <strong>"${groupName}"</strong> on Planningo.
            </p>
            
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 30px 0;">
              Click the button below to join the group and start tracking shared expenses.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                Join Group
              </a>
            </div>
            
            <p style="color: #9ca3af; font-size: 12px; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              Or copy this link: <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px; color: #374151;">${inviteCode}</code>
            </p>
            
            <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
              This invite will expire in 30 days.
            </p>
          </div>
          
          <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">© 2026 Planningo. All rights reserved.</p>
          </div>
        </div>
      `,
    })

    return { success: true, messageId: result.id }
  } catch (error: any) {
    console.error('Failed to send email:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to send email' 
    }
  }
}
