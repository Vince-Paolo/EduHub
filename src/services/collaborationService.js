// services/collaborationService.js
import { db } from './database'

class CollaborationService {
  // Group operations
  async createGroup(name, description, createdBy, moduleId = null) {
    const group = {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      createdBy,
      moduleId,
      createdAt: new Date().toISOString(),
      memberCount: 1,
      isActive: true
    }
    
    await db.add('groups', group)
    
    // Add creator as first member
    await this.addGroupMember(group.id, createdBy, 'admin')
    
    return group
  }

  async getGroup(groupId) {
    return db.get('groups', groupId)
  }

  async getAllGroups() {
    return db.getAll('groups')
  }

  async getUserGroups(userId) {
    const allMembers = await db.getByIndex('groupMembers', 'userId', userId)
    const groupIds = allMembers.map(m => m.groupId)
    
    const allGroups = await db.getAll('groups')
    return allGroups.filter(g => groupIds.includes(g.id))
  }

  async updateGroup(groupId, updates) {
    const group = await db.get('groups', groupId)
    const updated = { ...group, ...updates }
    await db.update('groups', updated)
    return updated
  }

  async deleteGroup(groupId) {
    // Delete all related data
    const members = await db.getByIndex('groupMembers', 'groupId', groupId)
    for (const member of members) {
      await db.delete('groupMembers', member.id)
    }
    
    const messages = await db.getByIndex('chatMessages', 'groupId', groupId)
    for (const msg of messages) {
      await db.delete('chatMessages', msg.id)
    }
    
    const files = await db.getByIndex('sharedFiles', 'groupId', groupId)
    for (const file of files) {
      await db.delete('sharedFiles', file.id)
    }
    
    return db.delete('groups', groupId)
  }

  // Group member operations
  async addGroupMember(groupId, userId, role = 'member') {
    const member = {
      id: `member_${groupId}_${userId}`,
      groupId,
      userId,
      role,
      joinedAt: new Date().toISOString()
    }
    
    await db.add('groupMembers', member)
    
    // Update member count
    const group = await db.get('groups', groupId)
    group.memberCount = (group.memberCount || 1) + 1
    await db.update('groups', group)
    
    return member
  }

  async removeGroupMember(groupId, userId) {
    const members = await db.getByIndex('groupMembers', 'groupId', groupId)
    const member = members.find(m => m.userId === userId)
    
    if (member) {
      await db.delete('groupMembers', member.id)
      
      // Update member count
      const group = await db.get('groups', groupId)
      group.memberCount = Math.max(0, (group.memberCount || 1) - 1)
      await db.update('groups', group)
    }
    
    return member
  }

  async getGroupMembers(groupId) {
    return db.getByIndex('groupMembers', 'groupId', groupId)
  }

  async isGroupMember(groupId, userId) {
    const members = await db.getByIndex('groupMembers', 'groupId', groupId)
    return members.some(m => m.userId === userId)
  }

  // Chat message operations
  async sendMessage(groupId, userId, content, attachments = []) {
    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      groupId,
      userId,
      content,
      attachments,
      createdAt: new Date().toISOString(),
      edited: false,
      editedAt: null
    }
    
    await db.add('chatMessages', message)
    return message
  }

  async getGroupMessages(groupId, limit = 50) {
    const messages = await db.getByIndex('chatMessages', 'groupId', groupId)
    return messages
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit)
      .reverse()
  }

  async editMessage(messageId, content) {
    const message = await db.get('chatMessages', messageId)
    if (!message) return null
    
    message.content = content
    message.edited = true
    message.editedAt = new Date().toISOString()
    
    await db.update('chatMessages', message)
    return message
  }

  async deleteMessage(messageId) {
    return db.delete('chatMessages', messageId)
  }

  // Utility functions
  async getGroupStats(groupId) {
    const members = await this.getGroupMembers(groupId)
    const messages = await this.getGroupMessages(groupId, Infinity)
    const files = await db.getByIndex('sharedFiles', 'groupId', groupId)
    
    return {
      totalMembers: members.length,
      totalMessages: messages.length,
      totalFiles: files.length,
      lastActivityAt: messages.length > 0 ? messages[messages.length - 1].createdAt : null
    }
  }
}

export const collaborationService = new CollaborationService()
