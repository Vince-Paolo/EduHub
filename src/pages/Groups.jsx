// pages/Groups.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { collaborationService } from '../services/collaborationService'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    loadGroups()
  }, [user])

  const loadGroups = async () => {
    if (!user?.uid) {
      setLoading(false)
      return
    }
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

  const handleUploadClick = () => {
    // Handle upload module click - can be implemented as needed
    console.log('Upload module clicked')
  }

  if (loading) {
    return (
      <>
        <Navbar onUpload={handleUploadClick} />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading your groups...</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar onUpload={handleUploadClick} />
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onUploadClick={handleUploadClick}
      />
      
      <div className={styles.mainLayout}>
        <div className={styles.container}>
          <div className={styles.sidebar}>
            <div className={styles.headerSection}>
              <h2>My Groups</h2>
              <button 
                className={styles.createBtn}
                onClick={() => setShowCreateModal(true)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                New Group
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
                  <button 
                    className={styles.menuToggle}
                    onClick={() => setIsSidebarOpen(true)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>

                <div className={styles.tabs}>
                  <button 
                    className={`${styles.tab} ${activeTab === 'chat' ? styles.active : ''}`}
                    onClick={() => setActiveTab('chat')}
                  >
                    <span>💬</span> Chat
                  </button>
                  <button 
                    className={`${styles.tab} ${activeTab === 'forum' ? styles.active : ''}`}
                    onClick={() => setActiveTab('forum')}
                  >
                    <span>💭</span> Forum
                  </button>
                  <button 
                    className={`${styles.tab} ${activeTab === 'announcements' ? styles.active : ''}`}
                    onClick={() => setActiveTab('announcements')}
                  >
                    <span>📢</span> Announcements
                  </button>
                  <button 
                    className={`${styles.tab} ${activeTab === 'content' ? styles.active : ''}`}
                    onClick={() => setActiveTab('content')}
                  >
                    <span>📁</span> Content Sharing
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
                <div className={styles.emptyIcon}>👥</div>
                <h3>No groups yet</h3>
                <p>Create your first group to start collaborating with others!</p>
                <button 
                  className={styles.createFirstBtn}
                  onClick={() => setShowCreateModal(true)}
                >
                  + Create First Group
                </button>
              </div>
            )}
          </div>
        </div>

        {showCreateModal && (
          <GroupCreation 
            onGroupCreated={handleGroupCreated}
            onCancel={() => setShowCreateModal(false)}
          />
        )}
      </div>
    </>
  )
}