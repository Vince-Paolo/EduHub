# Developer Quick Reference - EduHub Collaboration Features

## Quick Start for Developers

### Adding a New Collection to IndexedDB

```javascript
// 1. Edit database.js - Update DB_VERSION
const DB_VERSION = 4  // Increment version

// 2. In onupgradeneeded, add:
if (!db.objectStoreNames.contains('newCollection')) {
  const store = db.createObjectStore('newCollection', { keyPath: 'id' })
  store.createIndex('indexName', 'indexName', { unique: false })
}

// 3. Use in your service:
await db.add('newCollection', item)
await db.getByIndex('newCollection', 'indexName', value)
```

### Creating a New Service

```javascript
// src/services/myService.js
import { db } from './database'

class MyService {
  async createItem(data) {
    const item = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      createdAt: new Date().toISOString()
    }
    await db.add('myCollection', item)
    return item
  }

  async getItems() {
    return db.getAll('myCollection')
  }

  async updateItem(id, updates) {
    const item = await db.get('myCollection', id)
    const updated = { ...item, ...updates }
    await db.update('myCollection', updated)
    return updated
  }

  async deleteItem(id) {
    return db.delete('myCollection', id)
  }
}

export const myService = new MyService()
```

### Creating a New Component

```javascript
// src/components/MyComponent.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { myService } from '../services/myService'
import styles from './MyComponent.module.css'

export default function MyComponent() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      setLoading(true)
      const data = await myService.getItems()
      setItems(data)
    } catch (error) {
      console.error('Failed to load items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const newItem = await myService.createItem({ userId: user.uid })
      setItems([newItem, ...items])
    } catch (error) {
      console.error('Failed to create item:', error)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className={styles.container}>
      {items.map(item => (
        <div key={item.id}>{/* render item */}</div>
      ))}
    </div>
  )
}
```

### CSS Module Template

```css
/* components/MyComponent.module.css */
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.item {
  padding: 1rem;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.2s;
}

.item:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.button {
  padding: 0.75rem 1.5rem;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.button:hover {
  background-color: var(--primary-dark);
}
```

---

## Common Patterns

### Pattern 1: Loading with Error Handling

```javascript
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState('')

useEffect(() => {
  loadData()
}, [])

const loadData = async () => {
  try {
    setLoading(true)
    setError('')
    const result = await service.getData()
    setData(result)
  } catch (err) {
    console.error(err)
    setError('Failed to load data')
  } finally {
    setLoading(false)
  }
}
```

### Pattern 2: Create with Optimistic Update

```javascript
const handleCreate = async (formData) => {
  try {
    // Optimistic update
    const temp = { ...formData, id: 'temp_' + Date.now() }
    setItems([temp, ...items])

    // Actual create
    const created = await service.create(formData)

    // Replace temp with real
    setItems(prev => prev.map(item =>
      item.id === temp.id ? created : item
    ))
  } catch (error) {
    // Rollback on error
    setItems(prev => prev.filter(item => item.id !== temp.id))
    console.error(error)
  }
}
```

### Pattern 3: Form with Validation

```javascript
const [formData, setFormData] = useState({ title: '', content: '' })
const [errors, setErrors] = useState({})

const handleChange = (e) => {
  const { name, value } = e.target
  setFormData(prev => ({ ...prev, [name]: value }))
  setErrors(prev => ({ ...prev, [name]: '' }))
}

const validateForm = () => {
  const newErrors = {}
  if (!formData.title.trim()) newErrors.title = 'Title required'
  if (!formData.content.trim()) newErrors.content = 'Content required'
  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}

const handleSubmit = async (e) => {
  e.preventDefault()
  if (!validateForm()) return
  
  try {
    await service.create(formData)
    setFormData({ title: '', content: '' })
  } catch (error) {
    console.error(error)
  }
}
```

### Pattern 4: Polling for Updates

```javascript
useEffect(() => {
  // Load initial data
  loadData()

  // Poll for updates
  const interval = setInterval(() => {
    loadData()
  }, 2000) // Every 2 seconds

  // Cleanup
  return () => clearInterval(interval)
}, [groupId])
```

### Pattern 5: Conditional Rendering

```javascript
if (loading) return <LoadingSpinner />
if (error) return <ErrorMessage message={error} />
if (items.length === 0) return <EmptyState />

return (
  <div>
    {items.map(item => (
      <ItemCard key={item.id} item={item} />
    ))}
  </div>
)
```

---

## Testing Checklist

### For New Features

- [ ] Component renders without errors
- [ ] Data loads from IndexedDB
- [ ] Create operation works
- [ ] Update operation works
- [ ] Delete operation works
- [ ] Search/filter works
- [ ] Error handling works
- [ ] Loading states work
- [ ] Mobile responsive works
- [ ] Dark mode works
- [ ] Offline works (data persists)

### Browser Testing

- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari
- [ ] Android Chrome

---

## Debugging Tips

### 1. Check IndexedDB Data

```javascript
// In console:
const dbs = await indexedDB.databases()
const db = indexedDB.open('EduHubDB')
// Then inspect in DevTools → Application → IndexedDB
```

### 2. Log Service Calls

```javascript
// Add logging to services
async getData() {
  console.log('[myService] Fetching data...')
  const result = await db.getAll('myCollection')
  console.log('[myService] Got data:', result)
  return result
}
```

### 3. Clear Data for Testing

```javascript
// In console:
const db = indexedDB.open('EduHubDB')
// Wait for success, then:
db.result.deleteDatabase()
// Refresh page
```

### 4. Check Component State

```javascript
// Use React DevTools browser extension
// Or add console log:
useEffect(() => {
  console.log('[Component] State updated:', { state1, state2 })
}, [state1, state2])
```

---

## Performance Optimization

### 1. Memoize Components

```javascript
import { memo } from 'react'

const ItemCard = memo(({ item }) => (
  <div>{item.title}</div>
))
```

### 2. Lazy Load Lists

```javascript
const [items, setItems] = useState([])
const [page, setPage] = useState(0)
const ITEMS_PER_PAGE = 20

const loadMore = async () => {
  const start = page * ITEMS_PER_PAGE
  const end = start + ITEMS_PER_PAGE
  const moreItems = await service.getItems(start, end)
  setItems([...items, ...moreItems])
  setPage(page + 1)
}
```

### 3. Debounce Search

```javascript
import { useEffect, useRef } from 'react'

const [query, setQuery] = useState('')
const timeoutRef = useRef(null)

const handleSearch = (value) => {
  setQuery(value)
  clearTimeout(timeoutRef.current)
  timeoutRef.current = setTimeout(() => {
    searchService.search(value)
  }, 300)
}
```

---

## Common Gotchas

### ❌ Don't do this:

```javascript
// Mutating state directly
items[0].title = 'New Title' // ❌

// Not clearing intervals
setInterval(() => {}, 1000) // ❌ Memory leak

// Forgetting dependency array
useEffect(() => {
  loadData()
}) // ❌ Runs every render

// Using index as key
items.map((item, index) => <div key={index} />) // ❌

// Not handling errors
await service.create(data) // ❌ Silent fail
```

### ✅ Do this instead:

```javascript
// Create new array
setItems(prev => {
  const updated = [...prev]
  updated[0].title = 'New Title'
  return updated
})

// Store interval reference
const intervalId = setInterval(() => {}, 1000)
return () => clearInterval(intervalId) // ✅

// Include dependency array
useEffect(() => {
  loadData()
}, [groupId]) // ✅

// Use unique ID as key
items.map(item => <div key={item.id} />) // ✅

// Handle errors
try {
  await service.create(data)
} catch (error) {
  console.error(error)
} // ✅
```

---

## Useful Commands

```bash
# Start dev server
npm run dev

# Start dev server + backend
npm run dev:all

# Build for production
npm run build

# Run linter
npm run lint

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json && npm install
```

---

## Browser DevTools

### Application Tab
- IndexedDB → EduHubDB → View all stores
- Local Storage → userSettings, etc.
- Cookies → Session info

### Console
- Errors and warnings
- Debug logs
- Test service calls

### Network Tab
- Firebase API calls
- CORS issues
- Request/response payloads

---

## Resources

- [React Docs](https://react.dev)
- [MDN - IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Firebase Docs](https://firebase.google.com/docs)
- [CSS Modules](https://github.com/css-modules/css-modules)

---

## Getting Help

1. **Check console** - Error messages are logged
2. **Read docs** - COLLABORATION_GUIDE.md has answers
3. **Search code** - Find similar patterns
4. **Test in isolation** - Create minimal test case
5. **Check IndexedDB** - DevTools → Application

---

**Happy Coding! 🚀**
