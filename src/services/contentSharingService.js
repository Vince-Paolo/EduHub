// services/contentSharingService.js
import { db } from './database'

class ContentSharingService {
  // Shared file operations
  async uploadFile(groupId, uploadedBy, filename, fileUrl, fileType, fileSize, description = '') {
    const file = {
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      groupId,
      uploadedBy,
      filename,
      fileUrl,
      fileType,
      fileSize,
      description,
      uploadedAt: new Date().toISOString(),
      downloads: 0,
      views: 0,
      comments: [],
      tags: []
    }
    
    await db.add('sharedFiles', file)
    return file
  }

  async getFile(fileId) {
    const file = await db.get('sharedFiles', fileId)
    if (file) {
      file.views = (file.views || 0) + 1
      await db.update('sharedFiles', file)
    }
    return file
  }

  async getGroupFiles(groupId) {
    const files = await db.getByIndex('sharedFiles', 'groupId', groupId)
    return files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
  }

  async deleteFile(fileId) {
    return db.delete('sharedFiles', fileId)
  }

  async updateFileDescription(fileId, description) {
    const file = await db.get('sharedFiles', fileId)
    file.description = description
    await db.update('sharedFiles', file)
    return file
  }

  async recordDownload(fileId) {
    const file = await db.get('sharedFiles', fileId)
    file.downloads = (file.downloads || 0) + 1
    await db.update('sharedFiles', file)
    return file
  }

  async addTag(fileId, tag) {
    const file = await db.get('sharedFiles', fileId)
    if (!file.tags) file.tags = []
    if (!file.tags.includes(tag)) {
      file.tags.push(tag)
      await db.update('sharedFiles', file)
    }
    return file
  }

  async addFileComment(fileId, authorId, comment) {
    const file = await db.get('sharedFiles', fileId)
    if (!file.comments) file.comments = []
    
    file.comments.push({
      id: `comment_${Date.now()}`,
      authorId,
      content: comment,
      createdAt: new Date().toISOString()
    })
    
    await db.update('sharedFiles', file)
    return file
  }

  async searchFiles(groupId, query) {
    const files = await this.getGroupFiles(groupId)
    const lowerQuery = query.toLowerCase()
    
    return files.filter(f =>
      f.filename.toLowerCase().includes(lowerQuery) ||
      f.description.toLowerCase().includes(lowerQuery) ||
      (f.tags && f.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
    )
  }

  async filterFilesByType(groupId, fileType) {
    const files = await this.getGroupFiles(groupId)
    return files.filter(f => f.fileType === fileType)
  }

  // Shared note operations
  async createNote(groupId, authorId, title, content) {
    const note = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      groupId,
      authorId,
      title,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      editHistory: [],
      viewers: [authorId],
      collaborators: [],
      isPublic: true,
      tags: [],
      comments: []
    }
    
    await db.add('sharedNotes', note)
    return note
  }

  async getNote(noteId) {
    return db.get('sharedNotes', noteId)
  }

  async getGroupNotes(groupId) {
    const notes = await db.getByIndex('sharedNotes', 'groupId', groupId)
    return notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }

  async updateNote(noteId, title, content) {
    const note = await db.get('sharedNotes', noteId)
    
    // Save to edit history
    if (!note.editHistory) note.editHistory = []
    note.editHistory.push({
      timestamp: note.updatedAt,
      content: note.content
    })
    
    note.title = title
    note.content = content
    note.updatedAt = new Date().toISOString()
    
    await db.update('sharedNotes', note)
    return note
  }

  async deleteNote(noteId) {
    return db.delete('sharedNotes', noteId)
  }

  async shareNoteWithUser(noteId, userId) {
    const note = await db.get('sharedNotes', noteId)
    if (!note.collaborators) note.collaborators = []
    
    if (!note.collaborators.includes(userId)) {
      note.collaborators.push(userId)
      await db.update('sharedNotes', note)
    }
    
    return note
  }

  async recordNoteView(noteId, userId) {
    const note = await db.get('sharedNotes', noteId)
    if (!note.viewers) note.viewers = []
    
    if (!note.viewers.includes(userId)) {
      note.viewers.push(userId)
      await db.update('sharedNotes', note)
    }
    
    return note
  }

  async addNoteComment(noteId, authorId, comment) {
    const note = await db.get('sharedNotes', noteId)
    if (!note.comments) note.comments = []
    
    note.comments.push({
      id: `comment_${Date.now()}`,
      authorId,
      content: comment,
      createdAt: new Date().toISOString()
    })
    
    await db.update('sharedNotes', note)
    return note
  }

  async addNoteTag(noteId, tag) {
    const note = await db.get('sharedNotes', noteId)
    if (!note.tags) note.tags = []
    
    if (!note.tags.includes(tag)) {
      note.tags.push(tag)
      await db.update('sharedNotes', note)
    }
    
    return note
  }

  async searchNotes(groupId, query) {
    const notes = await this.getGroupNotes(groupId)
    const lowerQuery = query.toLowerCase()
    
    return notes.filter(n =>
      n.title.toLowerCase().includes(lowerQuery) ||
      n.content.toLowerCase().includes(lowerQuery) ||
      (n.tags && n.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
    )
  }

  // Statistics
  async getContentStats(groupId) {
    const files = await this.getGroupFiles(groupId)
    const notes = await this.getGroupNotes(groupId)
    
    return {
      totalFiles: files.length,
      totalNotes: notes.length,
      totalDownloads: files.reduce((sum, f) => sum + (f.downloads || 0), 0),
      totalViews: files.reduce((sum, f) => sum + (f.views || 0), 0) + 
                 notes.reduce((sum, n) => sum + (n.viewers ? n.viewers.length : 0), 0),
      recentActivity: [
        ...files.map(f => ({ type: 'file', item: f, date: f.uploadedAt })),
        ...notes.map(n => ({ type: 'note', item: n, date: n.updatedAt }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10)
    }
  }
}

export const contentSharingService = new ContentSharingService()
