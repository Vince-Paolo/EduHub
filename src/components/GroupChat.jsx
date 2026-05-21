// components/GroupChat.jsx
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { collaborationService } from '../services/collaborationService'
import { getUsersByIds } from '../services/userService'
import styles from './GroupChat.module.css'

export default function GroupChat({ groupId }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [members, setMembers] = useState([])
  const [memberProfiles, setMemberProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadMessages()
    loadMembers()
    const interval = setInterval(() => {
      loadMessages()
    }, 2000)
    return () => clearInterval(interval)
  }, [groupId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async () => {
    try {
      const msgs = await collaborationService.getGroupMessages(groupId)
      setMessages(msgs)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const loadMembers = async () => {
    try {
      const membersList = await collaborationService.getGroupMembers(groupId)
      setMembers(membersList)
      await loadMemberProfiles(membersList)
    } catch (error) {
      console.error('Failed to load members:', error)
    }
  }

  const loadMemberProfiles = async (membersList) => {
    const ids = Array.from(new Set(membersList.map(member => String(member.userId)).filter(Boolean)))
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

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    try {
      const newMessage = await collaborationService.sendMessage(
        groupId,
        user.uid,
        inputValue
      )
      setMessages([...messages, newMessage])
      setInputValue('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleDeleteMessage = async (messageId) => {
    if (window.confirm('Delete this message?')) {
      try {
        await collaborationService.deleteMessage(messageId)
        setMessages(messages.filter(m => m.id !== messageId))
      } catch (error) {
        console.error('Failed to delete message:', error)
      }
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading chat...</div>
  }

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messagesArea}>
        {messages.length === 0 ? (
          <div className={styles.emptyChat}>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map(message => (
            <div 
              key={message.id}
              className={`${styles.message} ${message.userId === user.uid ? styles.own : ''}`}
            >
              <div className={styles.messageContent}>
                <div className={styles.messageMeta}>
                  <span className={styles.author}>
                    {String(message.userId) === String(user.uid)
                      ? 'You'
                      : memberProfiles[String(message.userId)]?.fullName
                        || memberProfiles[String(message.userId)]?.username
                        || message.userId}
                  </span>
                  <span className={styles.timestamp}>
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className={styles.messageText}>{message.content}</div>
                {message.userId === user.uid && (
                  <button 
                    className={styles.deleteBtn}
                    onClick={() => handleDeleteMessage(message.id)}
                    title="Delete message"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className={styles.inputArea}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message..."
          className={styles.input}
        />
        <button 
          type="submit"
          className={styles.sendBtn}
          disabled={!inputValue.trim()}
        >
          Send
        </button>
      </form>
    </div>
  )
}
