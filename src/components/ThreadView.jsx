// components/ThreadView.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { forumService } from '../services/forumService'
import styles from './ThreadView.module.css'

export default function ThreadView({ threadId, onThreadUpdated, onDelete }) {
  const { user } = useAuth()
  const [thread, setThread] = useState(null)
  const [posts, setPosts] = useState([])
  const [replyContent, setReplyContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadThread()
  }, [threadId])

  const loadThread = async () => {
    try {
      setLoading(true)
      const threadData = await forumService.getThread(threadId)
      setThread(threadData)
      const postsList = await forumService.getThreadPosts(threadId)
      setPosts(postsList)
    } catch (error) {
      console.error('Failed to load thread:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePostReply = async (e) => {
    e.preventDefault()
    if (!replyContent.trim()) return

    try {
      const newPost = await forumService.replyToThread(
        threadId,
        user.uid,
        replyContent
      )
      setPosts([...posts, newPost])
      setReplyContent('')
      loadThread()
    } catch (error) {
      console.error('Failed to post reply:', error)
    }
  }

  const handleLikePost = async (postId) => {
    try {
      await forumService.likePost(postId)
      const updated = await forumService.getThreadPosts(threadId)
      setPosts(updated)
    } catch (error) {
      console.error('Failed to like post:', error)
    }
  }

  const handleDeletePost = async (postId) => {
    if (window.confirm('Delete this post?')) {
      try {
        await forumService.deletePost(postId)
        setPosts(posts.filter(p => p.id !== postId))
        loadThread()
      } catch (error) {
        console.error('Failed to delete post:', error)
      }
    }
  }

  const handlePinThread = async () => {
    try {
      await forumService.pinThread(threadId)
      loadThread()
    } catch (error) {
      console.error('Failed to pin thread:', error)
    }
  }

  const handleCloseThread = async () => {
    try {
      await forumService.closeThread(threadId)
      loadThread()
    } catch (error) {
      console.error('Failed to close thread:', error)
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading thread...</div>
  }

  if (!thread) {
    return <div className={styles.error}>Thread not found</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.threadContent}>
        <div className={styles.threadHeader}>
          <h2>{thread.title}</h2>
          <div className={styles.threadActions}>
            <button 
              className={styles.actionBtn}
              onClick={handlePinThread}
              title={thread.isPinned ? 'Unpin' : 'Pin'}
            >
              {thread.isPinned ? '📌' : '📍'}
            </button>
            <button 
              className={styles.actionBtn}
              onClick={handleCloseThread}
              title={thread.isClosed ? 'Reopen' : 'Close'}
            >
              {thread.isClosed ? '🔓' : '🔒'}
            </button>
            <button 
              className={styles.actionBtn}
              onClick={onDelete}
              title="Delete thread"
            >
              🗑
            </button>
          </div>
        </div>

        <div className={styles.threadMeta}>
          <span>By {thread.authorId} • {new Date(thread.createdAt).toLocaleString()}</span>
          <span>{thread.viewCount} views</span>
        </div>

        <div className={styles.threadBody}>
          {thread.content}
        </div>

        <div className={styles.postsSection}>
          <h3>Replies ({posts.length})</h3>

          {posts.length === 0 ? (
            <div className={styles.noPosts}>No replies yet. Be the first to reply!</div>
          ) : (
            <div className={styles.postsList}>
              {posts.map(post => (
                <div key={post.id} className={styles.post}>
                  <div className={styles.postHeader}>
                    <strong>{post.authorId}</strong>
                    <span className={styles.postDate}>
                      {new Date(post.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className={styles.postContent}>{post.content}</p>
                  <div className={styles.postActions}>
                    <button 
                      className={styles.likeBtn}
                      onClick={() => handleLikePost(post.id)}
                    >
                      👍 {post.likeCount || 0}
                    </button>
                    {post.authorId === user.uid && (
                      <button 
                        className={styles.deleteBtn}
                        onClick={() => handleDeletePost(post.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!thread.isClosed && (
        <form onSubmit={handlePostReply} className={styles.replyForm}>
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write your reply..."
            rows="4"
          />
          <button type="submit" disabled={!replyContent.trim()}>
            Post Reply
          </button>
        </form>
      )}
    </div>
  )
}
