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
      memberCount: 0,
      isActive: true
    }
    
    await db.add('groups', group)
    
    // Add creator as first member and recompute count
    await this.addGroupMember(group.id, createdBy, 'admin')
    
    return db.get('groups', group.id)

  }

  async getGroup(groupId) {
    const group = await db.get('groups', groupId)
    if (!group) return null

    const members = await db.getByIndex('groupMembers', 'groupId', groupId)
    const realCount = members.length
    if (group.memberCount !== realCount) {
      group.memberCount = realCount
      await db.update('groups', group)
    }

    return group
  }

  async getAllGroups() {
    const groups = await db.getAll('groups')
    return Promise.all(groups.map(async (group) => {
      const members = await db.getByIndex('groupMembers', 'groupId', group.id)
      const realCount = members.length
      if (group.memberCount !== realCount) {
        group.memberCount = realCount
        await db.update('groups', group)
      }
      return group
    }))
  }

  async getUserGroups(userId) {
    const allMembers = await db.getByIndex('groupMembers', 'userId', userId)
    const groupIds = allMembers.map(m => m.groupId)
    
    const allGroups = await this.getAllGroups()
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
    
    // Recompute member count from actual stored members
    const members = await db.getByIndex('groupMembers', 'groupId', groupId)
    const group = await db.get('groups', groupId)
    group.memberCount = members.length
    await db.update('groups', group)
    
    return member
  }

  async removeGroupMember(groupId, userId) {
    const members = await db.getByIndex('groupMembers', 'groupId', groupId)
    const member = members.find(m => m.userId === userId)
    
    if (member) {
      await db.delete('groupMembers', member.id)
      
      // Recompute member count from remaining members
      const remainingMembers = await db.getByIndex('groupMembers', 'groupId', groupId)
      const group = await db.get('groups', groupId)
      group.memberCount = remainingMembers.length
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

  // Invitation operations
  async sendInvitation(groupId, invitedUserId, invitedByUserId, invitedEmail = null) {
    const invitation = {
      id: `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      groupId,
      invitedUserId,
      invitedEmail: invitedEmail ? invitedEmail.toLowerCase() : null,
      invitedByUserId,
      status: 'pending', // pending, accepted, rejected, cancelled
      createdAt: new Date().toISOString(),
      respondedAt: null
    }
    
    await db.add('groupInvitations', invitation)
    return invitation
  }

  async getPendingInvitations(userId, userEmail) {
    const invitationsById = userId ? await db.getByIndex('groupInvitations', 'invitedUserId', userId) : []
    const invitationsByEmail = userEmail ? await db.getByIndex('groupInvitations', 'invitedEmail', userEmail.toLowerCase()) : []
    const invited = [...invitationsById, ...invitationsByEmail]
    const uniqueInvitations = invited.reduce((acc, invitation) => {
      if (!acc.some(item => item.id === invitation.id)) acc.push(invitation)
      return acc
    }, [])
    return uniqueInvitations.filter(inv => inv.status === 'pending')
  }

  async getInvitation(invitationId) {
    return db.get('groupInvitations', invitationId)
  }

  async acceptInvitation(invitationId, user, userEmail = null) {
    const invitation = await db.get('groupInvitations', invitationId)
    if (!invitation) throw new Error('Invitation not found')

    const authorizedById = user && invitation.invitedUserId === user
    const authorizedByEmail = userEmail && invitation.invitedEmail === userEmail.toLowerCase()
    if (!authorizedById && !authorizedByEmail) throw new Error('Unauthorized')
    
    // Add user to group
    const userId = user || invitation.invitedUserId
    await this.addGroupMember(invitation.groupId, userId, 'member')
    
    // Update invitation status
    invitation.status = 'accepted'
    invitation.respondedAt = new Date().toISOString()
    await db.update('groupInvitations', invitation)
    
    return invitation
  }

  async rejectInvitation(invitationId, user, userEmail = null) {
    const invitation = await db.get('groupInvitations', invitationId)
    if (!invitation) throw new Error('Invitation not found')

    const authorizedById = user && invitation.invitedUserId === user
    const authorizedByEmail = userEmail && invitation.invitedEmail === userEmail.toLowerCase()
    if (!authorizedById && !authorizedByEmail) throw new Error('Unauthorized')
    
    // Update invitation status
    invitation.status = 'rejected'
    invitation.respondedAt = new Date().toISOString()
    await db.update('groupInvitations', invitation)
    
    return invitation
  }

  async getGroupInvitations(groupId) {
    return db.getByIndex('groupInvitations', 'groupId', groupId)
  }

  async cancelInvitation(invitationId) {
    const invitation = await db.get('groupInvitations', invitationId)
    if (!invitation) throw new Error('Invitation not found')
    
    invitation.status = 'cancelled'
    invitation.respondedAt = new Date().toISOString()
    await db.update('groupInvitations', invitation)
    
    return invitation
  }
}

export const collaborationService = new CollaborationService()
