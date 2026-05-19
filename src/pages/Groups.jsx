// pages/Groups.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { collaborationService } from '../services/collaborationService'
import GroupList from '../components/GroupList'
import GroupCreation from '../components/GroupCreation'
import GroupChat from '../components/GroupChat'
import DiscussionForum from '../components/DiscussionForum'
import AnnouncementBoard from '../components/AnnouncementBoard'
import ContentSharing from '../components/ContentSharing'
import styles from './Groups.module.css'

export default function Groups() {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [activeTab, setActiveTab] = useState('chat')
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadGroups()
  }, [user])

  const loadGroups = async () => {
    if (!user?.uid) return
    try {
      setLoading(true)
      const userGroups = await collaborationService.getUserGroups(user.uid)
      setGroups(userGroups)
      if (userGroups.length > 0 && !selectedGroup) {
        setSelectedGroup(userGroups[0])
      }
    } catch (error) {
      console.error('Failed to load groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGroupCreated = (newGroup) => {
    setGroups([...groups, newGroup])
    setSelectedGroup(newGroup)
    setShowCreateModal(false)
  }

  const handleGroupDeleted = async (groupId) => {
    if (window.confirm('Are you sure you want to delete this group?')) {
      try {
        await collaborationService.deleteGroup(groupId)
        setGroups(groups.filter(g => g.id !== groupId))
        setSelectedGroup(null)
        setActiveTab('chat')
      } catch (error) {
        console.error('Failed to delete group:', error)
      }
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading groups...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.headerSection}>
          <h2>Groups</h2>
          <button 
            className={styles.createBtn}
            onClick={() => setShowCreateModal(true)}
          >
            + New Group
          </button>
        </div>
        
        <GroupList 
          groups={groups}
          selectedGroup={selectedGroup}
          onSelectGroup={setSelectedGroup}
          onDeleteGroup={handleGroupDeleted}
        />
      </div>

      <div className={styles.mainContent}>
        {selectedGroup ? (
          <>
            <div className={styles.header}>
              <div className={styles.groupInfo}>
                <h1>{selectedGroup.name}</h1>
                <p>{selectedGroup.description}</p>
              </div>
            </div>

            <div className={styles.tabs}>
              <button 
                className={`${styles.tab} ${activeTab === 'chat' ? styles.active : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                💬 Chat
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'forum' ? styles.active : ''}`}
                onClick={() => setActiveTab('forum')}
              >
                💭 Forum
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'announcements' ? styles.active : ''}`}
                onClick={() => setActiveTab('announcements')}
              >
                📢 Announcements
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'content' ? styles.active : ''}`}
                onClick={() => setActiveTab('content')}
              >
                📁 Content Sharing
              </button>
            </div>

            <div className={styles.tabContent}>
              {activeTab === 'chat' && <GroupChat groupId={selectedGroup.id} />}
              {activeTab === 'forum' && <DiscussionForum groupId={selectedGroup.id} />}
              {activeTab === 'announcements' && <AnnouncementBoard groupId={selectedGroup.id} />}
              {activeTab === 'content' && <ContentSharing groupId={selectedGroup.id} />}
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <p>No groups yet. Create one to get started!</p>
            <button onClick={() => setShowCreateModal(true)}>Create First Group</button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <GroupCreation 
          onGroupCreated={handleGroupCreated}
          onCancel={() => setShowCreateModal(false)}
        />
      )}
    </div>
  )
}
