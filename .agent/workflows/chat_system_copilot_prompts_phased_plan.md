# Phase 1 – MVP (phase-1-mvp.md)

## Goal
Build a **minimal but reliable** Customer ↔ Admin real-time chat that works across backend, web, and mobile.
Focus on correctness, simplicity, and integration with existing code.

---

## Scope (INTENTIONALLY LIMITED)

### Included
- One customer ↔ one admin
- Text messages only
- Single active chat per customer
- Real-time messaging with Socket.IO
- MongoDB persistence
- Message history (pagination)
- JWT-based socket authentication

### Explicitly Excluded (for Phase 1)
- Typing indicators
- Read receipts
- File/image upload
- Push notifications
- Offline support
- Multiple admin assignment
- Chat transfer

---

## Architecture Rules (IMPORTANT)

- MongoDB is the **source of truth**
- Socket.IO is **transport only**
- On reconnect, always resync messages from database
- Do NOT create new auth logic, axios instances, or state libraries
- Reuse existing middleware, models, and utilities

---

## Backend – Phase 1 Prompts

### Socket.IO Setup
```
Create Socket.IO server integrated with existing Express app that:
- Authenticates connections using JWT from socket handshake
- Rejects unauthenticated connections
- Uses namespace '/chat'
- Handles connection and disconnection cleanly
- Logs connection lifecycle events
```

### Database Schemas (Minimal)
```
Create MongoDB schemas using Mongoose:

ChatRoom:
- _id
- customerId (ref User)
- adminId (ref User)
- status: 'open' | 'closed'
- lastMessageAt
- createdAt, updatedAt

Message:
- _id
- roomId (ref ChatRoom)
- senderId
- senderRole: 'customer' | 'admin'
- content (text)
- createdAt

Add indexes on roomId and createdAt.
```

### Core Socket Events
```
Implement socket events:

1. 'join-chat'
- Verify user access
- Create or fetch open room
- Join socket room
- Load last 50 messages
- Emit 'chat-history'

2. 'send-message'
- Validate message length
- Save message to DB
- Emit to room
- Use Socket.IO ACK to confirm save

3. 'disconnect'
- Log disconnection
- Update in-memory connection map
```

---

## Frontend Web – Phase 1 Prompts

### Socket Client
```
Create socketService.js that:
- Uses existing config and env
- Sends JWT in auth payload
- Auto-connects and reconnects
- Exposes connect(), disconnect(), emit()
```

### UI Components
```
Create minimal chat UI:
- ChatWidget (open/close)
- ChatWindow (messages + input)
- MessageList (scrollable)
- MessageBubble (left/right alignment)

Text only, no attachments.
```

### State Management
```
Store:
- activeRoomId
- messages by roomId
- connection status

Actions:
- addMessage
- setMessages
- setConnectionStatus
```

---

## Mobile (React Native) – Phase 1 Prompts

```
Implement ChatScreen with:
- FlatList for messages
- KeyboardAvoidingView
- TextInput + Send button
- Socket connection on screen focus
- Disconnect on blur
```

---

## Phase 1 Exit Criteria
- Messages deliver in real time
- Messages persist and reload correctly
- No duplicate rooms
- Reconnect restores chat state

---

# Phase 2 – Enhancements (phase-2-enhancements.md)

## Goal
Improve UX, reliability, and engagement without changing core architecture.

---

## New Features Added

### Messaging UX
- Typing indicators
- Read receipts
- Delivered status
- Unread message counts

### Media & Notifications
- Image/file upload
- Push notifications (mobile)
- Browser notifications (admin)

### Admin Tools
- Admin assignment
- Admin chat dashboard
- Close chat

---

## Backend – Phase 2 Prompts

### Extended Schemas
```
Extend Message schema:
- status: sent | delivered | read
- deliveredAt
- readAt

Extend ChatRoom:
- unreadCountCustomer
- unreadCountAdmin
```

### New Socket Events
```
Add:
- 'typing'
- 'stop-typing'
- 'message-read'
- 'admin-assign'
- 'close-chat'

Debounce typing events.
```

### File Upload API
```
Create POST /api/chat/upload:
- Validate file type and size
- Store using existing upload service
- Return file URL
```

---

## Frontend Web – Phase 2 Prompts

### UI Enhancements
- Typing indicator UI
- Read/delivered icons
- Image preview
- Load-more pagination

### Admin Dashboard
- Chat room list
- Filters (open, assigned)
- Customer info panel
- Close chat action

---

## Mobile – Phase 2 Prompts

- Image picker integration
- Push notifications via FCM
- Badge counts
- Read receipt handling

---

## Phase 2 Exit Criteria
- Smooth UX with no flicker
- Accurate unread counts
- Push notifications reliable
- Admin workflow efficient

---

# Phase 3 – Scaling & Hardening (phase-3-scaling.md)

## Goal
Make the chat system scalable, fault-tolerant, and production-hardened.

---

## Scalability Enhancements

### Socket.IO Scaling
```
- Use Redis adapter for Socket.IO
- Enable sticky sessions
- Support horizontal scaling
```

### Connection Management
```
- Map userId → socketIds
- Support multiple devices per user
- Graceful reconnect handling
```

---

## Performance Optimization

### Backend
- Cursor-based pagination
- Lean MongoDB queries
- Message batching
- Rate limiting per socket

### Frontend
- Virtualized message lists
- Memoized message components
- Throttled typing indicators

### Mobile
- Image caching
- FlatList getItemLayout
- Reduced reconnect frequency

---

## Reliability & Security

### Security
- Rate limit messages
- Validate room access on every event
- Token refresh strategy
- Sanitization on server side only

### Reliability
- ACK-based messaging
- Retry queue for failed messages
- DB-backed resync on reconnect

---

## Monitoring & Ops

```
- Track active connections
- Log message delivery latency
- Alert on socket error spikes
- Dashboard for chat metrics
```

---

## Phase 3 Exit Criteria
- Handles high concurrency
- Zero message loss
- Stable under reconnect storms
- Observable and debuggable

---

## Author Notes (Added Recommendations)

- Build Phase 1 fast, but do NOT skip ACKs
- Never trust socket state alone
- Always prefer DB truth over client state
- Add features only after stability
- Keep prompts small when using Copilot

