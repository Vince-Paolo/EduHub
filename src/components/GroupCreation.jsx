// components/GroupCreation.jsx
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { collaborationService } from '../services/collaborationService'
import styles from './GroupCreation.module.css'

export default function GroupCreation({ onGroupCreated, onCancel }) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Group name is required')
      return
    }

    try {
      setLoading(true)
      const newGroup = await collaborationService.createGroup(
        formData.name,
        formData.description,
        user.uid
      )
      onGroupCreated(newGroup)
    } catch (err) {
      console.error('Error creating group:', err)
      setError('Failed to create group. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Create New Study Group</h2>
          <button className={styles.closeBtn} onClick={onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Group Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Advanced React Study"
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the purpose of this group..."
              rows="4"
              disabled={loading}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button 
              type="button" 
              className={styles.cancelBtn}
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
