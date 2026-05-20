# EduHub - Collaboration & Content Sharing Features

## Overview

EduHub has been enhanced with powerful collaboration tools and content sharing features to facilitate group learning and knowledge exchange among students.

## New Features

### 1. **Groups & Study Communities**
- **Create Groups**: Users can create new study groups with descriptive names and purposes
- **Group Management**: Track member count and manage group membership
- **Group Selection**: Switch between multiple groups easily

### 2. **Group Chat**
- **Real-time Messaging**: Send and receive messages instantly within groups
- **Message Management**: Edit or delete your own messages
- **Auto-refresh**: Chat updates every 2 seconds
- **User Identification**: Messages show who sent them and when

### 3. **Discussion Forums**
- **Create Threads**: Start new discussion topics within groups
- **Thread Management**: Pin important threads, close discussions, or delete threads
- **Reply System**: Users can reply to threads and view conversation threads
- **Thread Statistics**: View reply count, view count, and activity dates
- **Search**: Search through threads by title or content

### 4. **Announcement Board**
- **Priority Levels**: Post announcements with different priority levels:
  - 🚨 Urgent
  - ⬆️ High
  - ➡️ Normal
  - ⬇️ Low
- **Read Tracking**: Track who has read each announcement
- **Sorting**: Announcements automatically sorted by priority and recency
- **Unread Indicators**: Visual indicators for unread announcements

### 5. **Content Sharing**
- **File Sharing**: Upload and share files with group members
  - Track downloads
  - View file descriptions
  - Tag files for organization
  - Add comments to files
  
- **Note Sharing**: Create and share notes with the group
  - Collaborative notes
  - View tracking
  - Edit history
  - Tags for organization
  - Comments and discussions

- **Search & Filter**: Find files and notes by keyword, type, or tag

## File Structure

### New Services
```
src/services/
├── collaborationService.js    # Groups, members, chat messages
├── forumService.js            # Discussion threads and posts
├── announcementService.js     # Announcements with priority levels
└── contentSharingService.js   # Files and notes sharing
```

### New Components
```
src/components/
├── GroupList.jsx              # List of user's groups
├── GroupList.module.css
├── GroupCreation.jsx          # Modal to create new group
├── GroupCreation.module.css
├── GroupChat.jsx              # Real-time group messaging
├── GroupChat.module.css
├── DiscussionForum.jsx        # Forum thread management
├── DiscussionForum.module.css
├── ThreadView.jsx             # View and reply to threads
├── ThreadView.module.css
├── AnnouncementBoard.jsx      # Announcement management
├── AnnouncementBoard.module.css
├── ContentSharing.jsx         # File and note sharing
└── ContentSharing.module.css
```

### New Pages
```
src/pages/
├── Groups.jsx                 # Main groups page with tabs
└── Groups.module.css
```

### Database Updates
- Updated `DB_VERSION` from 2 to 3
- Added 8 new IndexedDB stores:
  - `groups`: Study groups
  - `groupMembers`: Group membership
  - `chatMessages`: Group messages
  - `discussionThreads`: Forum threads
  - `discussionPosts`: Forum replies
  - `announcements`: Group announcements
  - `sharedFiles`: Shared files
  - `sharedNotes`: Shared notes

## Usage Guide

### Creating a Group
1. Navigate to the **Groups** page from the navbar
2. Click **+ New Group**
3. Enter group name and description
4. Click **Create Group**

### Sending Messages in Group Chat
1. Select a group
2. Click on the **💬 Chat** tab
3. Type your message in the input field
4. Click **Send**

### Creating a Discussion Thread
1. Select a group and go to **💭 Forum** tab
2. Click **+ New Thread**
3. Enter title and content
4. Click **Post Thread**
5. Other members can click to view and reply

### Posting Announcements
1. Select a group and go to **📢 Announcements** tab
2. Click **+ New Announcement**
3. Enter title and content
4. Select priority level
5. Click **Post Announcement**

### Sharing Content
1. Select a group and go to **📁 Content Sharing** tab
2. For **Files**:
   - Click **+ Upload File**
   - Select file and add description
   - Click **Upload File**
3. For **Notes**:
   - Click **+ New Note**
   - Enter title and content
   - Click **Create Note**

## API Methods

### CollaborationService

```javascript
// Groups
await collaborationService.createGroup(name, description, createdBy, moduleId)
await collaborationService.getGroup(groupId)
await collaborationService.getUserGroups(userId)
await collaborationService.updateGroup(groupId, updates)
await collaborationService.deleteGroup(groupId)

// Members
await collaborationService.addGroupMember(groupId, userId, role)
await collaborationService.removeGroupMember(groupId, userId)
await collaborationService.getGroupMembers(groupId)
await collaborationService.isGroupMember(groupId, userId)

// Chat
await collaborationService.sendMessage(groupId, userId, content, attachments)
await collaborationService.getGroupMessages(groupId, limit)
await collaborationService.editMessage(messageId, content)
await collaborationService.deleteMessage(messageId)

// Stats
await collaborationService.getGroupStats(groupId)
```

### ForumService

```javascript
// Threads
await forumService.createThread(groupId, authorId, title, content)
await forumService.getThread(threadId)
await forumService.getGroupThreads(groupId)
await forumService.updateThread(threadId, updates)
await forumService.deleteThread(threadId)
await forumService.pinThread(threadId)
await forumService.closeThread(threadId)

// Posts
await forumService.replyToThread(threadId, authorId, content)
await forumService.getThreadPosts(threadId)
await forumService.updatePost(postId, content)
await forumService.deletePost(postId)
await forumService.likePost(postId)

// Search & Stats
await forumService.searchThreads(groupId, query)
await forumService.getForumStats(groupId)
```

### AnnouncementService

```javascript
await announcementService.createAnnouncement(groupId, authorId, title, content, priority)
await announcementService.getAnnouncement(announcementId)
await announcementService.getGroupAnnouncements(groupId)
await announcementService.updateAnnouncement(announcementId, updates)
await announcementService.deleteAnnouncement(announcementId)
await announcementService.markAsRead(announcementId, userId)
await announcementService.markAllAsRead(groupId, userId)
await announcementService.getUnreadCount(groupId, userId)
```

### ContentSharingService

```javascript
// Files
await contentSharingService.uploadFile(groupId, uploadedBy, filename, fileUrl, fileType, fileSize, description)
await contentSharingService.getFile(fileId)
await contentSharingService.getGroupFiles(groupId)
await contentSharingService.deleteFile(fileId)
await contentSharingService.recordDownload(fileId)
await contentSharingService.addTag(fileId, tag)
await contentSharingService.searchFiles(groupId, query)

// Notes
await contentSharingService.createNote(groupId, authorId, title, content)
await contentSharingService.getNote(noteId)
await contentSharingService.getGroupNotes(groupId)
await contentSharingService.updateNote(noteId, title, content)
await contentSharingService.deleteNote(noteId)
await contentSharingService.shareNoteWithUser(noteId, userId)
await contentSharingService.recordNoteView(noteId, userId)
await contentSharingService.searchNotes(groupId, query)
```

## Data Structure

### Group Object
```javascript
{
  id: string,
  name: string,
  description: string,
  createdBy: string,
  moduleId: string | null,
  createdAt: ISO string,
  memberCount: number,
  isActive: boolean
}
```

### Chat Message Object
```javascript
{
  id: string,
  groupId: string,
  userId: string,
  content: string,
  attachments: array,
  createdAt: ISO string,
  edited: boolean,
  editedAt: ISO string | null
}
```

### Discussion Thread Object
```javascript
{
  id: string,
  groupId: string,
  authorId: string,
  title: string,
  content: string,
  createdAt: ISO string,
  updatedAt: ISO string,
  replyCount: number,
  viewCount: number,
  isPinned: boolean,
  isClosed: boolean
}
```

### Announcement Object
```javascript
{
  id: string,
  groupId: string,
  authorId: string,
  title: string,
  content: string,
  priority: 'low' | 'normal' | 'high' | 'urgent',
  createdAt: ISO string,
  updatedAt: ISO string,
  readBy: array,
  attachments: array
}
```

### Shared File Object
```javascript
{
  id: string,
  groupId: string,
  uploadedBy: string,
  filename: string,
  fileUrl: string,
  fileType: string,
  fileSize: number,
  description: string,
  uploadedAt: ISO string,
  downloads: number,
  views: number,
  comments: array,
  tags: array
}
```

### Shared Note Object
```javascript
{
  id: string,
  groupId: string,
  authorId: string,
  title: string,
  content: string,
  createdAt: ISO string,
  updatedAt: ISO string,
  editHistory: array,
  viewers: array,
  collaborators: array,
  isPublic: boolean,
  tags: array,
  comments: array
}
```

## Next Steps & Enhancements

### Recommended Future Features
1. **Real-time Sync**: Use Firebase Realtime Database instead of polling for live updates
2. **File Upload to Cloud**: Integrate Firebase Storage for file uploads
3. **User Profiles**: Show user avatars and profiles in groups
4. **Notifications**: Real-time notifications for messages and announcements
5. **Voice/Video Calls**: Add peer-to-peer video calling
6. **Rich Text Editor**: Replace textarea with rich text editor for notes
7. **File Previews**: Display previews for PDFs, images, documents
8. **Permissions**: Add role-based permissions (admin, moderator, member)
9. **Invitations**: Send invites to join groups
10. **Activity Feed**: Centralized activity feed for group activities

## Styling

All components use CSS Modules and support:
- Light and dark themes (via CSS variables)
- Responsive design for mobile/tablet/desktop
- Accessible colors and contrast ratios
- Smooth animations and transitions

CSS Variables used:
- `--primary-color`: Main brand color
- `--primary-dark`: Darker variant
- `--primary-light`: Lighter variant
- `--bg-color`: Background
- `--bg-secondary`: Secondary background
- `--bg-hover`: Hover state background
- `--text-color`: Primary text
- `--text-secondary`: Secondary text
- `--border-color`: Border color

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Known Limitations

1. **Polling for Updates**: Chat and messages refresh every 2 seconds (consider WebSocket for real-time)
2. **File Storage**: Currently stores file URLs from object URLs (not persisted after refresh)
3. **Offline Sync**: New stores sync automatically with offline content when back online
4. **Member Roles**: Currently only admin/member roles (no moderator or custom roles)

## Testing

To test the features:
1. Create multiple user accounts
2. Create a study group
3. Invite other users to the group
4. Test each feature (chat, forum, announcements, files, notes)
5. Verify data persists in IndexedDB

## Troubleshooting

### Groups not appearing
- Clear IndexedDB and refresh
- Check browser console for errors
- Ensure DB_VERSION is correctly incremented

### Messages not sending
- Check user authentication status
- Verify group membership
- Check browser console for error messages

### Files not uploading
- Check file size
- Verify file format is supported
- Check IndexedDB quota

## Support

For issues or questions, refer to the main README.md or contact the development team.
