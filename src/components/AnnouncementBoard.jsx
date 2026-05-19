// components/AnnouncementBoard.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { announcementService } from '../services/announcementService'
import styles from './AnnouncementBoard.module.css'

export default function AnnouncementBoard({ groupId }) {
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal'
  })

  useEffect(() => {
    loadAnnouncements()
  }, [groupId])

  const loadAnnouncements = async () => {
    try {
      setLoading(true)
      const announceList = await announcementService.getGroupAnnouncements(groupId)
      setAnnouncements(announceList)
    } catch (error) {
      console.error('Failed to load announcements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.content.trim()) return

    try {
      const newAnnounce = await announcementService.createAnnouncement(
        groupId,
        user.uid,
        formData.title,
        formData.content,
        formData.priority
      )
      
      // Mark as read for creator
      await announcementService.markAsRead(newAnnounce.id, user.uid)
      
      setAnnouncements([newAnnounce, ...announcements])
      setFormData({ title: '', content: '', priority: 'normal' })
      setShowForm(false)
    } catch (error) {
      console.error('Failed to create announcement:', error)
    }
  }

  const handleMarkAsRead = async (announcementId) => {
    try {
      await announcementService.markAsRead(announcementId, user.uid)
      loadAnnouncements()
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const handleDeleteAnnouncement = async (announcementId) => {
    if (window.confirm('Delete this announcement?')) {
      try {
        await announcementService.deleteAnnouncement(announcementId)
        setAnnouncements(announcements.filter(a => a.id !== announcementId))
      } catch (error) {
        console.error('Failed to delete announcement:', error)
      }
    }
  }

  const getPriorityClass = (priority) => {
    return styles[`priority${priority.charAt(0).toUpperCase() + priority.slice(1)}`]
  }

  const getPriorityLabel = (priority) => {
    const labels = {
      low: '⬇️ Low',
      normal: '➡️ Normal',
      high: '⬆️ High',
      urgent: '🚨 Urgent'
    }
    return labels[priority] || priority
  }

  if (loading) {
    return <div className={styles.loading}>Loading announcements...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Announcement Board</h3>
        <button 
          className={styles.newBtn}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Cancel' : '+ New Announcement'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateAnnouncement} className={styles.form}>
          <input
            type="text"
            placeholder="Announcement title..."
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className={styles.titleInput}
          />
          <textarea
            placeholder="Announcement details..."
            value={formData.content}
            onChange={(e) => setFormData({...formData, content: e.target.value})}
            rows="4"
            className={styles.contentInput}
          />
          <div className={styles.formFooter}>
            <select 
              value={formData.priority}
              onChange={(e) => setFormData({...formData, priority: e.target.value})}
              className={styles.prioritySelect}
            >
              <option value="low">Low Priority</option>
              <option value="normal">Normal Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
            <button type="submit" className={styles.submitBtn}>
              Post Announcement
            </button>
          </div>
        </form>
      )}

      <div className={styles.announcements}>
        {announcements.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No announcements yet</p>
          </div>
        ) : (
          announcements.map(announcement => {
            const isRead = announcement.readBy.includes(user.uid)
            return (
              <div 
                key={announcement.id}
                className={`${styles.announcement} ${getPriorityClass(announcement.priority)} ${!isRead ? styles.unread : ''}`}
              >
                <div className={styles.announceHeader}>
                  <div className={styles.titleSection}>
                    <h4>{announcement.title}</h4>
                    <span className={styles.priorityBadge}>
                      {getPriorityLabel(announcement.priority)}
                    </span>
                  </div>
                  <button 
                    className={styles.deleteBtn}
                    onClick={() => handleDeleteAnnouncement(announcement.id)}
                  >
                    ×
                  </button>
                </div>
                <p className={styles.content}>{announcement.content}</p>
                <div className={styles.meta}>
                  <span>By {announcement.authorId}</span>
                  <span>{new Date(announcement.createdAt).toLocaleString()}</span>
                  <span>{announcement.readBy.length} people read this</span>
                </div>
                {!isRead && (
                  <button 
                    className={styles.markReadBtn}
                    onClick={() => handleMarkAsRead(announcement.id)}
                  >
                    Mark as read
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
