// components/DiscussionForum.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { forumService } from '../services/forumService'
import ThreadView from './ThreadView'
import styles from './DiscussionForum.module.css'

export default function DiscussionForum({ groupId }) {
  const { user } = useAuth()
  const [threads, setThreads] = useState([])
  const [selectedThread, setSelectedThread] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showNewThread, setShowNewThread] = useState(false)
  const [formData, setFormData] = useState({ title: '', content: '' })

  useEffect(() => {
    loadThreads()
  }, [groupId])

  const loadThreads = async () => {
    try {
      setLoading(true)
      const threadsList = await forumService.getGroupThreads(groupId)
      setThreads(threadsList)
    } catch (error) {
      console.error('Failed to load threads:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateThread = async (e) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.content.trim()) return

    try {
      const newThread = await forumService.createThread(
        groupId,
        user.uid,
        formData.title,
        formData.content
      )
      setThreads([newThread, ...threads])
      setFormData({ title: '', content: '' })
      setShowNewThread(false)
    } catch (error) {
      console.error('Failed to create thread:', error)
    }
  }

  const handleDeleteThread = async (threadId) => {
    if (window.confirm('Delete this thread and all replies?')) {
      try {
        await forumService.deleteThread(threadId)
        setThreads(threads.filter(t => t.id !== threadId))
        setSelectedThread(null)
      } catch (error) {
        console.error('Failed to delete thread:', error)
      }
    }
  }

  const handleThreadUpdated = () => {
    loadThreads()
  }

  if (selectedThread) {
    return (
      <div className={styles.container}>
        <button 
          className={styles.backBtn}
          onClick={() => setSelectedThread(null)}
        >
          ← Back to Threads
        </button>
        <ThreadView 
          threadId={selectedThread}
          onThreadUpdated={handleThreadUpdated}
          onDelete={() => {
            handleDeleteThread(selectedThread)
            setSelectedThread(null)
          }}
        />
      </div>
    )
  }

  if (loading) {
    return <div className={styles.loading}>Loading forum...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Discussion Forum</h3>
        <button 
          className={styles.newThreadBtn}
          onClick={() => setShowNewThread(!showNewThread)}
        >
          {showNewThread ? '✕ Cancel' : '+ New Thread'}
        </button>
      </div>

      {showNewThread && (
        <form onSubmit={handleCreateThread} className={styles.newThreadForm}>
          <input
            type="text"
            placeholder="Thread title..."
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className={styles.titleInput}
          />
          <textarea
            placeholder="Share your question or topic..."
            value={formData.content}
            onChange={(e) => setFormData({...formData, content: e.target.value})}
            rows="4"
            className={styles.contentInput}
          />
          <button type="submit" className={styles.submitBtn}>
            Post Thread
          </button>
        </form>
      )}

      <div className={styles.threadsList}>
        {threads.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No discussions yet. Start one!</p>
          </div>
        ) : (
          threads.map(thread => (
            <div 
              key={thread.id}
              className={styles.threadItem}
              onClick={() => setSelectedThread(thread.id)}
            >
              <div className={styles.threadHeader}>
                <h4>{thread.title}</h4>
                {thread.isPinned && <span className={styles.pinnedBadge}>📌 Pinned</span>}
                {thread.isClosed && <span className={styles.closedBadge}>🔒 Closed</span>}
              </div>
              <p className={styles.threadPreview}>{thread.content.substring(0, 100)}...</p>
              <div className={styles.threadStats}>
                <span>💬 {thread.replyCount} replies</span>
                <span>👁 {thread.viewCount} views</span>
                <span>{new Date(thread.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
