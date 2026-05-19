// services/announcementService.js
import { db } from './database'

class AnnouncementService {
  async createAnnouncement(groupId, authorId, title, content, priority = 'normal') {
    const announcement = {
      id: `announce_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      groupId,
      authorId,
      title,
      content,
      priority, // 'low', 'normal', 'high', 'urgent'
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readBy: [],
      attachments: []
    }
    
    await db.add('announcements', announcement)
    return announcement
  }

  async getAnnouncement(announcementId) {
    return db.get('announcements', announcementId)
  }

  async getGroupAnnouncements(groupId) {
    const announcements = await db.getByIndex('announcements', 'groupId', groupId)
    return announcements.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 }
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
  }

  async updateAnnouncement(announcementId, updates) {
    const announcement = await db.get('announcements', announcementId)
    const updated = { ...announcement, ...updates, updatedAt: new Date().toISOString() }
    await db.update('announcements', updated)
    return updated
  }

  async deleteAnnouncement(announcementId) {
    return db.delete('announcements', announcementId)
  }

  async markAsRead(announcementId, userId) {
    const announcement = await db.get('announcements', announcementId)
    if (!announcement.readBy.includes(userId)) {
      announcement.readBy.push(userId)
      await db.update('announcements', announcement)
    }
    return announcement
  }

  async markAllAsRead(groupId, userId) {
    const announcements = await this.getGroupAnnouncements(groupId)
    for (const announcement of announcements) {
      if (!announcement.readBy.includes(userId)) {
        announcement.readBy.push(userId)
        await db.update('announcements', announcement)
      }
    }
    return announcements
  }

  async getUnreadCount(groupId, userId) {
    const announcements = await this.getGroupAnnouncements(groupId)
    return announcements.filter(a => !a.readBy.includes(userId)).length
  }

  async addAttachment(announcementId, attachment) {
    const announcement = await db.get('announcements', announcementId)
    announcement.attachments.push({
      id: `attach_${Date.now()}`,
      filename: attachment.filename,
      url: attachment.url,
      size: attachment.size,
      uploadedAt: new Date().toISOString()
    })
    await db.update('announcements', announcement)
    return announcement
  }
}

export const announcementService = new AnnouncementService()
