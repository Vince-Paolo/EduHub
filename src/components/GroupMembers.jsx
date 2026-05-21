// components/GroupMembers.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { collaborationService } from '../services/collaborationService'
import { getUsersByIds } from '../services/userService'
import InviteModal from './InviteModal'
import styles from './GroupMembers.module.css'

export default function GroupMembers({ groupId, groupName, createdBy }) {
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [memberProfiles, setMemberProfiles] = useState({})
  const [loading, setLoading] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    loadMembers()
    checkIfAdmin()
  }, [groupId, user?.uid])

  const loadMembers = async () => {
    try {
      setLoading(true)
      const groupMembers = await collaborationService.getGroupMembers(groupId)
      setMembers(groupMembers)
      await loadMemberProfiles(groupMembers)
    } catch (error) {
      console.error('Failed to load members:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMemberProfiles = async (groupMembers) => {
    const ids = Array.from(new Set(groupMembers.map(member => String(member.userId)).filter(Boolean)))
    if (!ids.length) {
      setMemberProfiles({})
      return
    }

    try {
      const users = await getUsersByIds(ids)
      setMemberProfiles(Object.fromEntries(users.map((user) => [String(user.id), user])))
    } catch (error) {
      console.error('Failed to load member profiles:', error)
      setMemberProfiles({})
    }
  }

  const checkIfAdmin = () => {
    setIsAdmin(createdBy === user?.uid)
  }

  const handleRemoveMember = async (memberId, memberId_value) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        await collaborationService.removeGroupMember(groupId, memberId_value)
        setMembers(members.filter(m => m.id !== memberId))
      } catch (error) {
        console.error('Failed to remove member:', error)
      }
    }
  }

  return (
    <div className={styles.membersContainer}>
      <div className={styles.header}>
        <h3>👥 Members ({members.length})</h3>
        {isAdmin && (
          <button
            className={styles.inviteBtn}
            onClick={() => setShowInviteModal(true)}
            title="Invite new members"
          >
            + Invite
          </button>
        )}
      </div>

      {loading ? (
        <div className={styles.loading}>Loading members...</div>
      ) : members.length === 0 ? (
        <div className={styles.empty}>No members yet</div>
      ) : (
        <div className={styles.membersList}>
          {members.map((member) => {
            const profile = memberProfiles[String(member.userId)]
            const displayName = String(member.userId) === String(user?.uid)
              ? 'You'
              : profile?.fullName || profile?.username || profile?.email || member.userId

            return (
              <div key={member.id} className={styles.memberItem}>
                <div className={styles.memberInfo}>
                  <div className={styles.memberName}>
                    {displayName}
                  </div>
                  <div className={styles.memberRole}>
                    {member.role === 'admin' ? '👑 Admin' : 'Member'}
                  </div>
                </div>
                {isAdmin && member.role !== 'admin' && (
                  <button
                    className={styles.removeBtn}
                    onClick={() => handleRemoveMember(member.id, member.userId)}
                    title="Remove member"
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showInviteModal && (
        <InviteModal
          groupId={groupId}
          groupName={groupName}
          onInviteSent={() => {
            loadMembers()
            setShowInviteModal(false)
          }}
          onCancel={() => setShowInviteModal(false)}
        />
      )}
    </div>
  )
}
