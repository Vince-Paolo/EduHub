// components/ContentSharing.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { contentSharingService } from '../services/contentSharingService'
import styles from './ContentSharing.module.css'

export default function ContentSharing({ groupId }) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('files')
  const [files, setFiles] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [showNoteCreate, setShowNoteCreate] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [fileDescription, setFileDescription] = useState('')
  const [noteData, setNoteData] = useState({ title: '', content: '' })
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadContent()
  }, [groupId])

  const loadContent = async () => {
    try {
      setLoading(true)
      const filesList = await contentSharingService.getGroupFiles(groupId)
      const notesList = await contentSharingService.getGroupNotes(groupId)
      setFiles(filesList)
      setNotes(notesList)
    } catch (error) {
      console.error('Failed to load content:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e) => {
    e.preventDefault()
    if (!uploadFile) return

    try {
      // In a real app, you'd upload to cloud storage and get URL
      const fileUrl = URL.createObjectURL(uploadFile)
      
      const newFile = await contentSharingService.uploadFile(
        groupId,
        user.uid,
        uploadFile.name,
        fileUrl,
        uploadFile.type,
        uploadFile.size,
        fileDescription
      )
      
      setFiles([newFile, ...files])
      setUploadFile(null)
      setFileDescription('')
      setShowFileUpload(false)
    } catch (error) {
      console.error('Failed to upload file:', error)
    }
  }

  const handleCreateNote = async (e) => {
    e.preventDefault()
    if (!noteData.title.trim() || !noteData.content.trim()) return

    try {
      const newNote = await contentSharingService.createNote(
        groupId,
        user.uid,
        noteData.title,
        noteData.content
      )
      
      setNotes([newNote, ...notes])
      setNoteData({ title: '', content: '' })
      setShowNoteCreate(false)
    } catch (error) {
      console.error('Failed to create note:', error)
    }
  }

  const handleDeleteFile = async (fileId) => {
    if (window.confirm('Delete this file?')) {
      try {
        await contentSharingService.deleteFile(fileId)
        setFiles(files.filter(f => f.id !== fileId))
      } catch (error) {
        console.error('Failed to delete file:', error)
      }
    }
  }

  const handleDeleteNote = async (noteId) => {
    if (window.confirm('Delete this note?')) {
      try {
        await contentSharingService.deleteNote(noteId)
        setNotes(notes.filter(n => n.id !== noteId))
      } catch (error) {
        console.error('Failed to delete note:', error)
      }
    }
  }

  const handleDownload = async (file) => {
    try {
      await contentSharingService.recordDownload(file.id)
      const updatedFiles = await contentSharingService.getGroupFiles(groupId)
      setFiles(updatedFiles)
      
      // Trigger download
      const a = document.createElement('a')
      a.href = file.fileUrl
      a.download = file.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download file:', error)
    }
  }

  const filteredFiles = files.filter(f =>
    f.filename.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return <div className={styles.loading}>Loading content...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'files' ? styles.active : ''}`}
            onClick={() => setActiveTab('files')}
          >
            📁 Files ({files.length})
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'notes' ? styles.active : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            📝 Notes ({notes.length})
          </button>
        </div>
        
        <div className={styles.actions}>
          <input 
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          {activeTab === 'files' && (
            <button 
              className={styles.addBtn}
              onClick={() => setShowFileUpload(!showFileUpload)}
            >
              {showFileUpload ? '✕' : '+ Upload File'}
            </button>
          )}
          {activeTab === 'notes' && (
            <button 
              className={styles.addBtn}
              onClick={() => setShowNoteCreate(!showNoteCreate)}
            >
              {showNoteCreate ? '✕' : '+ New Note'}
            </button>
          )}
        </div>
      </div>

      {activeTab === 'files' && (
        <>
          {showFileUpload && (
            <form onSubmit={handleFileUpload} className={styles.uploadForm}>
              <div className={styles.fileInput}>
                <label>Select File</label>
                <input 
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
              <textarea 
                placeholder="File description (optional)"
                value={fileDescription}
                onChange={(e) => setFileDescription(e.target.value)}
                rows="3"
              />
              <button type="submit" disabled={!uploadFile}>
                Upload File
              </button>
            </form>
          )}

          <div className={styles.contentList}>
            {filteredFiles.length === 0 ? (
              <div className={styles.empty}>No files shared yet</div>
            ) : (
              filteredFiles.map(file => (
                <div key={file.id} className={styles.contentItem}>
                  <div className={styles.itemHeader}>
                    <div className={styles.itemTitle}>
                      <span className={styles.icon}>📄</span>
                      <div>
                        <h4>{file.filename}</h4>
                        <p className={styles.meta}>
                          By {file.uploadedBy} • {(file.fileSize / 1024).toFixed(2)}KB • {file.downloads} downloads
                        </p>
                      </div>
                    </div>
                    <div className={styles.itemActions}>
                      <button 
                        className={styles.downloadBtn}
                        onClick={() => handleDownload(file)}
                      >
                        ⬇ Download
                      </button>
                      {file.uploadedBy === user.uid && (
                        <button 
                          className={styles.deleteBtn}
                          onClick={() => handleDeleteFile(file.id)}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                  {file.description && (
                    <p className={styles.description}>{file.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === 'notes' && (
        <>
          {showNoteCreate && (
            <form onSubmit={handleCreateNote} className={styles.noteForm}>
              <input 
                type="text"
                placeholder="Note title..."
                value={noteData.title}
                onChange={(e) => setNoteData({...noteData, title: e.target.value})}
              />
              <textarea 
                placeholder="Write your note..."
                value={noteData.content}
                onChange={(e) => setNoteData({...noteData, content: e.target.value})}
                rows="6"
              />
              <button type="submit">Create Note</button>
            </form>
          )}

          <div className={styles.contentList}>
            {filteredNotes.length === 0 ? (
              <div className={styles.empty}>No notes shared yet</div>
            ) : (
              filteredNotes.map(note => (
                <div key={note.id} className={styles.contentItem}>
                  <div className={styles.itemHeader}>
                    <div className={styles.itemTitle}>
                      <span className={styles.icon}>📝</span>
                      <div>
                        <h4>{note.title}</h4>
                        <p className={styles.meta}>
                          By {note.authorId} • {note.viewers?.length || 0} views • Updated {new Date(note.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {note.authorId === user.uid && (
                      <button 
                        className={styles.deleteBtn}
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                  <p className={styles.notePreview}>{note.content.substring(0, 150)}...</p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
