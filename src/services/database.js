// services/database.js
const DB_NAME = 'EduHubDB'
const DB_VERSION = 2

class DatabaseService {
  constructor() {
    this.db = null
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        // Users store
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' })
          userStore.createIndex('username', 'username', { unique: true })
          userStore.createIndex('email', 'email', { unique: true })
        }

        // Modules store
        if (!db.objectStoreNames.contains('modules')) {
          const moduleStore = db.createObjectStore('modules', { keyPath: 'id' })
          moduleStore.createIndex('title', 'title', { unique: false })
          moduleStore.createIndex('uploadedAt', 'uploadedAt', { unique: false })
        }

        // Quizzes store
        if (!db.objectStoreNames.contains('quizzes')) {
          const quizStore = db.createObjectStore('quizzes', { keyPath: 'id' })
          quizStore.createIndex('moduleId', 'moduleId', { unique: false })
          quizStore.createIndex('status', 'status', { unique: false })
        }

        // Quiz attempts store
        if (!db.objectStoreNames.contains('quizAttempts')) {
          const attemptStore = db.createObjectStore('quizAttempts', { keyPath: 'id' })
          attemptStore.createIndex('quizId', 'quizId', { unique: false })
          attemptStore.createIndex('userId', 'userId', { unique: false })
        }

        // User settings store
        if (!db.objectStoreNames.contains('userSettings')) {
          db.createObjectStore('userSettings', { keyPath: 'userId' })
        }

        // Offline content store
        if (!db.objectStoreNames.contains('offlineContent')) {
          const contentStore = db.createObjectStore('offlineContent', { keyPath: 'id' })
          contentStore.createIndex('moduleId', 'moduleId', { unique: false })
        }
      }
    })
  }

  // Generic CRUD operations
  async add(storeName, item) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.add(item)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async get(storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async update(storeName, item) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(item)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(id)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index(indexName)
      const request = index.getAll(value)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
}

export const db = new DatabaseService()