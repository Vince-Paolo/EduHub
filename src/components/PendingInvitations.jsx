// components/PendingInvitations.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import { collaborationService } from '../services/collaborationService'
import styles from './PendingInvitations.module.css'

export default function PendingInvitations({ onInvitationHandled }) {
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  const [invitations, setInvitations] = useState([])
  const [groups, setGroups] = useState({})
  const [loading, setLoading] = useState(false)
  const [actionInProgress, setActionInProgress] = useState(null)

  useEffect(() => {
    if (user?.uid) {
      loadInvitations()
    }
  }, [user?.uid])

  const loadInvitations = async () => {
    try {
      setLoading(true)
      const pending = await collaborationService.getPendingInvitations(user.uid, user.email)
      setInvitations(pending)

      // Load group details for each invitation
      const groupDetails = {}
      for (const invite of pending) {
        const group = await collaborationService.getGroup(invite.groupId)
        if (group) {
          groupDetails[invite.groupId] = group
        }
      }
      setGroups(groupDetails)
    } catch (error) {
      console.error('Failed to load invitations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (invitationId) => {
    try {
      setActionInProgress(invitationId)
      await collaborationService.acceptInvitation(invitationId, user.uid, user.email)
      const invitation = invitations.find(inv => inv.id === invitationId)
      const groupName = invitation ? groups[invitation.groupId]?.name : 'the group'
      setInvitations(invitations.filter(inv => inv.id !== invitationId))
      addNotification({
        type: 'success',
        title: 'Invitation accepted',
        message: `You joined ${groupName}.`
      })
      if (onInvitationHandled) {
        onInvitationHandled()
      }
    } catch (error) {
      console.error('Failed to accept invitation:', error)
      addNotification({
        type: 'error',
        title: 'Accept failed',
        message: 'Unable to accept this invitation. Please try again.'
      })
    } finally {
      setActionInProgress(null)
    }
  }

  const handleReject = async (invitationId) => {
    try {
      setActionInProgress(invitationId)
      await collaborationService.rejectInvitation(invitationId, user.uid, user.email)
      const invitation = invitations.find(inv => inv.id === invitationId)
      const groupName = invitation ? groups[invitation.groupId]?.name : 'the group'
      setInvitations(invitations.filter(inv => inv.id !== invitationId))
      addNotification({
        type: 'info',
        title: 'Invitation declined',
        message: `You declined the invitation to ${groupName}.`
      })
    } catch (error) {
      console.error('Failed to reject invitation:', error)
      addNotification({
        type: 'error',
        title: 'Reject failed',
        message: 'Unable to decline this invitation. Please try again.'
      })
    } finally {
      setActionInProgress(null)
    }
  }

  if (!invitations.length) {
    return null
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>📬 Pending Invitations ({invitations.length})</h3>
      </div>

      <div className={styles.invitationsList}>
        {invitations.map(invitation => {
          const group = groups[invitation.groupId]
          const isLoading = actionInProgress === invitation.id

          return (
            <div key={invitation.id} className={styles.invitationItem}>
              <div className={styles.invitationContent}>
                <div className={styles.groupName}>{group?.name || 'Unknown Group'}</div>
                <div className={styles.groupDescription}>{group?.description || ''}</div>
                <div className={styles.inviteDate}>
                  Invited on {new Date(invitation.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  className={styles.acceptBtn}
                  onClick={() => handleAccept(invitation.id)}
                  disabled={isLoading}
                  title="Accept invitation"
                >
                  {isLoading ? '⏳' : '✓'} Accept
                </button>
                <button
                  className={styles.rejectBtn}
                  onClick={() => handleReject(invitation.id)}
                  disabled={isLoading}
                  title="Reject invitation"
                >
                  {isLoading ? '⏳' : '✕'} Reject
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
