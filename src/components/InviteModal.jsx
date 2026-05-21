// components/InviteModal.jsx
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import { collaborationService } from '../services/collaborationService'
import styles from './InviteModal.module.css'

export default function InviteModal({ groupId, groupName, onInviteSent, onCancel }) {
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sentInvites, setSentInvites] = useState([])

  const handleSendInvite = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email.trim()) {
      setError('Please enter an email address')
      return
    }

    try {
      setLoading(true)

      // For this implementation, we'll store the invite with a placeholder user ID
      // In production, you'd look up the user by email from your backend
      const normalizedEmail = email.toLowerCase().trim()
      const invitedUserId = `user_${normalizedEmail.replace(/[^a-z0-9]/g, '_')}`
      
      const invitation = await collaborationService.sendInvitation(
        groupId,
        invitedUserId,
        user.uid,
        normalizedEmail
      )

      setSentInvites([...sentInvites, { email, status: 'sent' }])
      setSuccess(`Invitation sent to ${email}`)
      addNotification({
        type: 'success',
        title: 'Invitation sent',
        message: `Successfully invited ${email} to ${groupName}.`
      })
      setEmail('')

      if (onInviteSent) {
        onInviteSent(invitation)
      }
    } catch (err) {
      console.error('Error sending invitation:', err)
      setError('Failed to send invitation. Please try again.')
      addNotification({
        type: 'error',
        title: 'Invitation failed',
        message: 'Could not send the invitation. Please try again later.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Invite Members to {groupName}</h2>
          <button className={styles.closeBtn} onClick={onCancel}>×</button>
        </div>

        <form onSubmit={handleSendInvite} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              placeholder="user@example.com"
              disabled={loading}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          {sentInvites.length > 0 && (
            <div className={styles.sentList}>
              <h3>Invitations Sent:</h3>
              <div className={styles.invitesList}>
                {sentInvites.map((invite, idx) => (
                  <div key={idx} className={styles.inviteItem}>
                    <span className={styles.email}>{invite.email}</span>
                    <span className={styles.badge}>Sent</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.actions}>
            <button 
              type="button" 
              className={styles.cancelBtn}
              onClick={onCancel}
              disabled={loading}
            >
              Done
            </button>
            <button 
              type="submit" 
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>

        <p className={styles.hint}>
          💡 Members will appear in the group once they accept the invitation
        </p>
      </div>
    </div>
  )
}
