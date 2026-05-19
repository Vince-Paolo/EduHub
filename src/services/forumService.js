// services/forumService.js
import { db } from './database'

class ForumService {
  // Discussion thread operations
  async createThread(groupId, authorId, title, content) {
    const thread = {
      id: `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      groupId,
      authorId,
      title,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replyCount: 0,
      viewCount: 0,
      isPinned: false,
      isClosed: false
    }
    
    await db.add('discussionThreads', thread)
    return thread
  }

  async getThread(threadId) {
    const thread = await db.get('discussionThreads', threadId)
    if (thread) {
      thread.viewCount = (thread.viewCount || 0) + 1
      await db.update('discussionThreads', thread)
    }
    return thread
  }

  async getGroupThreads(groupId) {
    const threads = await db.getByIndex('discussionThreads', 'groupId', groupId)
    return threads.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return b.isPinned - a.isPinned
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
  }

  async updateThread(threadId, updates) {
    const thread = await db.get('discussionThreads', threadId)
    const updated = { ...thread, ...updates, updatedAt: new Date().toISOString() }
    await db.update('discussionThreads', updated)
    return updated
  }

  async deleteThread(threadId) {
    // Delete all posts in this thread
    const posts = await db.getByIndex('discussionPosts', 'threadId', threadId)
    for (const post of posts) {
      await db.delete('discussionPosts', post.id)
    }
    
    return db.delete('discussionThreads', threadId)
  }

  async pinThread(threadId) {
    return this.updateThread(threadId, { isPinned: true })
  }

  async unpinThread(threadId) {
    return this.updateThread(threadId, { isPinned: false })
  }

  async closeThread(threadId) {
    return this.updateThread(threadId, { isClosed: true })
  }

  async reopenThread(threadId) {
    return this.updateThread(threadId, { isClosed: false })
  }

  // Discussion post operations
  async replyToThread(threadId, authorId, content) {
    const post = {
      id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      threadId,
      authorId,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likeCount: 0,
      edited: false
    }
    
    await db.add('discussionPosts', post)
    
    // Increment thread reply count
    const thread = await db.get('discussionThreads', threadId)
    thread.replyCount = (thread.replyCount || 0) + 1
    thread.updatedAt = new Date().toISOString()
    await db.update('discussionThreads', thread)
    
    return post
  }

  async getThreadPosts(threadId) {
    const posts = await db.getByIndex('discussionPosts', 'threadId', threadId)
    return posts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  }

  async getPost(postId) {
    return db.get('discussionPosts', postId)
  }

  async updatePost(postId, content) {
    const post = await db.get('discussionPosts', postId)
    post.content = content
    post.updatedAt = new Date().toISOString()
    post.edited = true
    
    await db.update('discussionPosts', post)
    return post
  }

  async deletePost(postId) {
    const post = await db.get('discussionPosts', postId)
    if (!post) return null
    
    // Decrement thread reply count
    const thread = await db.get('discussionThreads', post.threadId)
    if (thread) {
      thread.replyCount = Math.max(0, (thread.replyCount || 1) - 1)
      await db.update('discussionThreads', thread)
    }
    
    return db.delete('discussionPosts', postId)
  }

  async likePost(postId) {
    const post = await db.get('discussionPosts', postId)
    post.likeCount = (post.likeCount || 0) + 1
    await db.update('discussionPosts', post)
    return post
  }

  async unlikePost(postId) {
    const post = await db.get('discussionPosts', postId)
    post.likeCount = Math.max(0, (post.likeCount || 1) - 1)
    await db.update('discussionPosts', post)
    return post
  }

  // Utility functions
  async getForumStats(groupId) {
    const threads = await db.getByIndex('discussionThreads', 'groupId', groupId)
    const totalReplies = threads.reduce((sum, t) => sum + (t.replyCount || 0), 0)
    const totalViews = threads.reduce((sum, t) => sum + (t.viewCount || 0), 0)
    
    return {
      totalThreads: threads.length,
      totalReplies,
      totalViews
    }
  }

  async searchThreads(groupId, query) {
    const threads = await db.getByIndex('discussionThreads', 'groupId', groupId)
    const lowerQuery = query.toLowerCase()
    
    return threads.filter(t => 
      t.title.toLowerCase().includes(lowerQuery) ||
      t.content.toLowerCase().includes(lowerQuery)
    )
  }
}

export const forumService = new ForumService()
