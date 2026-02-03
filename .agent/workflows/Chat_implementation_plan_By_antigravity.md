# Phase 1 Chat System - Implementation Plan

Build a **minimal but reliable** Customer ↔ Admin real-time chat for BivanHandicraft e-commerce platform, working across backend, web, and mobile.

---

## Scope (Phase 1 MVP)

| ✅ Included | ❌ Excluded |
|------------|------------|
| One customer ↔ one admin | Typing indicators |
| Text messages only | Read receipts |
| Single active chat per customer | File/image upload |
| Real-time messaging (Socket.IO) | Push notifications |
| MongoDB persistence | Offline support |
| Message history (pagination) | Multiple admin assignment |
| JWT-based socket authentication | Chat transfer |

---

## Architecture Rules

> [!IMPORTANT]
> - MongoDB is the **source of truth**
> - Socket.IO is **transport only**
> - On reconnect, always resync messages from database
> - Reuse existing [verifyAccessToken](file:///d:/BivanHandicraft/backend/utils/tokenUtils.ts#35-41), axios instances, and Redux patterns

---

## Proposed Changes

### Backend (Node.js/Express)

#### [NEW] [ChatRoom.ts](file:///d:/BivanHandicraft/backend/models/ChatRoom.ts)
Mongoose schema for chat rooms:
- `customerId` (ref User), `adminId` (ref User, optional)
- `status`: 'open' | 'closed'
- `lastMessageAt`, `createdAt`, `updatedAt`

#### [NEW] [Message.ts](file:///d:/BivanHandicraft/backend/models/Message.ts)
Mongoose schema for messages:
- `roomId` (ref ChatRoom), `senderId` (ref User)
- `senderRole`: 'customer' | 'admin'
- `content` (text, max 2000 chars)
- Indexes on `roomId` + `createdAt` for efficient history queries

#### [NEW] [socket.ts](file:///d:/BivanHandicraft/backend/config/socket.ts)
Socket.IO server configuration:
- Authenticate connections using JWT from handshake auth
- Use namespace `/chat`
- Implement events: `join-chat`, `send-message`, `disconnect`
- ACK-based message confirmation

#### [MODIFY] [server.ts](file:///d:/BivanHandicraft/backend/server.ts)
- Import and initialize Socket.IO with the HTTP server
- Attach socket instance for potential use in controllers

#### [MODIFY] [package.json](file:///d:/BivanHandicraft/backend/package.json)
- Add `socket.io` and `@types/socket.io` dependencies

---

### Frontend Web (React/Vite)

#### [NEW] [socketService.ts](file:///d:/BivanHandicraft/frontend/src/services/socketService.ts)
Socket client service:
- Uses existing `VITE_API_URL` config
- Sends JWT from localStorage in auth payload
- Exposes `connect()`, `disconnect()`, `emit()`, [on()](file:///d:/BivanHandicraft/frontend/src/api/axios.ts#8-11), `off()`

#### [NEW] [chatSlice.ts](file:///d:/BivanHandicraft/frontend/src/store/chatSlice.ts)
Redux slice for chat state:
- `activeRoomId`, `messages`, `connectionStatus`, `isOpen`
- Actions: `setRoomId`, `addMessage`, `setMessages`, `setConnectionStatus`, `toggleChat`

#### [MODIFY] [index.ts](file:///d:/BivanHandicraft/frontend/src/store/index.ts)
- Register `chatReducer` in Redux store

#### [NEW] [ChatWidget.tsx](file:///d:/BivanHandicraft/frontend/src/components/chat/ChatWidget.tsx)
Floating chat button that shows/hides the chat window

#### [NEW] [ChatWindow.tsx](file:///d:/BivanHandicraft/frontend/src/components/chat/ChatWindow.tsx)
Main chat container with header, message list, and input form

#### [NEW] [MessageList.tsx](file:///d:/BivanHandicraft/frontend/src/components/chat/MessageList.tsx)
Scrollable message list with auto-scroll to bottom

#### [NEW] [MessageBubble.tsx](file:///d:/BivanHandicraft/frontend/src/components/chat/MessageBubble.tsx)
Individual message bubble with left/right alignment based on sender

#### [MODIFY] [App.tsx](file:///d:/BivanHandicraft/frontend/src/App.tsx)
- Import and render `ChatWidget` for logged-in users

#### [MODIFY] [package.json](file:///d:/BivanHandicraft/frontend/package.json)
- Add `socket.io-client` dependency

---

### Mobile (React Native/Expo)

#### [NEW] [socketService.ts](file:///d:/BivanHandicraft/mobile/src/services/socketService.ts)
Socket client for React Native using Expo SecureStore for token retrieval

#### [NEW] [chatSlice.ts](file:///d:/BivanHandicraft/mobile/src/store/chatSlice.ts)
Redux slice mirroring web structure

#### [MODIFY] [index.ts](file:///d:/BivanHandicraft/mobile/src/store/index.ts)
- Register `chatReducer` in Redux store

#### [NEW] [ChatScreen.tsx](file:///d:/BivanHandicraft/mobile/src/screens/ChatScreen.tsx)
- FlatList for messages
- KeyboardAvoidingView for input
- Socket connection on screen focus, disconnect on blur

#### [MODIFY] Navigation files
- Add ChatScreen to navigation stack

#### [MODIFY] [package.json](file:///d:/BivanHandicraft/mobile/package.json)
- Add `socket.io-client` dependency

---

## Verification Plan

### Automated Tests

Since the project currently has minimal test coverage (empty test script in backend), we will focus on **manual integration testing** for Phase 1. After the implementation, I can set up proper unit/integration tests.

### Manual Verification Steps

1. **Backend Socket Connection Test**
   ```bash
   cd d:\BivanHandicraft\backend
   npm run dev
   ```
   - Verify server starts without errors
   - Check console logs for Socket.IO initialization

2. **Frontend Chat Test**
   ```bash
   cd d:\BivanHandicraft\frontend
   npm run dev
   ```
   - Login as a customer
   - Click floating chat button → Chat window opens
   - Send a message → Message appears in list
   - Open DevTools Network tab → Verify WebSocket connection

3. **Admin Panel Chat Test**
   - Login as admin in a separate browser/incognito
   - Open admin chat dashboard (if exists) or use same chat widget
   - Verify real-time message delivery between customer and admin

4. **Mobile Chat Test**
   ```bash
   cd d:\BivanHandicraft\mobile
   npm start
   ```
   - Open on device/emulator
   - Login → Navigate to chat
   - Send message → Verify delivery
   - Background/foreground app → Verify reconnection restores history

5. **Persistence Test**
   - Send messages, then refresh page/app
   - Verify all messages reload from database

> [!NOTE]
> User assistance may be needed to verify multi-device scenarios and production URL testing.

---

## Exit Criteria (Phase 1)
- ✅ Messages deliver in real time
- ✅ Messages persist and reload correctly  
- ✅ No duplicate rooms per customer
- ✅ Reconnect restores chat state from database
