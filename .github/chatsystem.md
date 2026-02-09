Phase 1 – MVP (phase-1-mvp.md)
Goal
Build a minimal but reliable Customer ↔ Admin real-time chat that works across backend, web, and mobile.
Focus on correctness, simplicity, and integration with existing code.

Scope (INTENTIONALLY LIMITED)
Included

One customer ↔ one admin
Text messages only
Single active chat per customer
Real-time messaging with Socket.IO
MongoDB persistence
Message history (pagination)
JWT-based socket authentication

Explicitly Excluded (for Phase 1)

Typing indicators
Read receipts
File/image upload
Push notifications
Offline support
Multiple admin assignment
Chat transfer


Architecture Rules (IMPORTANT)

MongoDB is the source of truth
Socket.IO is transport only
On reconnect, always resync messages from database
Do NOT create new auth logic, axios instances, or state libraries
Reuse existing middleware, models, and utilities
Socket.IO must NOT block Express REST API
All async operations must have error boundaries


Backend – Phase 1 Prompts
STEP 0: Pre-Integration Checklist
BEFORE adding Socket.IO, verify existing app:

1. Test that existing REST API works:
   - Create a GET /api/health route that returns { status: 'ok' }
   - Verify it responds in browser

2. Check current server structure:
   - Locate where Express app is created (usually app.js or server.js)
   - Identify where app.listen() is called
   - Note the PORT variable location

3. Verify these files exist and work:
   - JWT verification middleware
   - MongoDB connection setup
   - User model with role field

DO NOT PROCEED until REST API is confirmed working.
STEP 1: Server Infrastructure Setup
Modify your main server file (server.js or app.js):

CRITICAL ORDER OF OPERATIONS:

1. Import and create Express app
2. Apply all middleware (json, cors, etc.)
3. Register all existing REST API routes
4. Create HTTP server from Express app
5. Initialize Socket.IO with the HTTP server
6. Configure Socket.IO separately from Express
7. Connect to MongoDB
8. Start HTTP server (NOT Express app)

EXACT IMPLEMENTATION:

// At the top
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');

// Create Express app
const app = express();

// Apply existing middleware FIRST
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Register ALL existing REST routes BEFORE Socket.IO
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
// ... all your existing routes

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Create HTTP server (this is the change from app.listen)
const httpServer = http.createServer(app);

// Initialize Socket.IO AFTER all routes
const io = require('socket.io')(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000
});

// Import socket initialization (created in next step)
require('./sockets/chatSocket')(io);

// Database connection and server start
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    // CRITICAL: Use httpServer.listen NOT app.listen
    httpServer.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ Socket.IO enabled on namespace /chat`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

CRITICAL RULES:
- NEVER call app.listen() - always use httpServer.listen()
- Socket.IO initialization must happen AFTER all REST routes
- CORS config must match between Express and Socket.IO
- Do NOT put socket handlers in this file
STEP 2: Socket.IO Initialization (Separate File)
Create file: sockets/chatSocket.js

This file handles ONLY socket logic, isolated from Express.

const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = (io) => {
  // Create chat namespace
  const chatNamespace = io.of('/chat');

  // Authentication middleware
  chatNamespace.use(async (socket, next) => {
    try {
      // Extract token from handshake
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify token (use your existing JWT_SECRET)
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Fetch user from database
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user to socket
      socket.user = user;
      socket.userId = user._id.toString();
      socket.userRole = user.role; // 'customer' or 'admin'
      
      next();
    } catch (error) {
      console.error('Socket auth error:', error.message);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  chatNamespace.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userId} (${socket.userRole})`);

    // Import event handlers (created in next step)
    require('./handlers/joinChat')(socket, chatNamespace);
    require('./handlers/sendMessage')(socket, chatNamespace);
    
    // Disconnection handler
    socket.on('disconnect', (reason) => {
      console.log(`❌ User disconnected: ${socket.userId}, reason: ${reason}`);
    });

    // Error handler
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });
};

CRITICAL RULES:
- ALL async operations must be wrapped in try-catch
- NEVER throw errors directly - use next(new Error())
- Authentication failures must disconnect socket gracefully
- Log all connection/disconnection events
- Do NOT perform database operations synchronously
STEP 3: Database Schemas
Create file: models/ChatRoom.js

const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for finding customer's active room
chatRoomSchema.index({ customerId: 1, status: 1 });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);

---

Create file: models/Message.js

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderRole: {
    type: String,
    enum: ['customer', 'admin'],
    required: true
  },
  content: {
    type: String,
    required: true,
    maxLength: 2000
  }
}, {
  timestamps: true
});

// Compound index for efficient pagination
messageSchema.index({ roomId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);

CRITICAL RULES:
- Always use indexes on query fields
- Set maxLength to prevent abuse
- Use timestamps for automatic createdAt/updatedAt
STEP 4: Socket Event Handlers
Create file: sockets/handlers/joinChat.js

const ChatRoom = require('../../models/ChatRoom');
const Message = require('../../models/Message');

module.exports = (socket, chatNamespace) => {
  socket.on('join-chat', async (data, callback) => {
    try {
      const userId = socket.userId;
      const userRole = socket.userRole;

      let room;

      if (userRole === 'customer') {
        // Find or create customer's active room
        room = await ChatRoom.findOne({
          customerId: userId,
          status: 'open'
        });

        if (!room) {
          room = await ChatRoom.create({
            customerId: userId,
            status: 'open'
          });
        }
      } else if (userRole === 'admin') {
        // Admin joins specific room by ID
        const { roomId } = data;
        
        if (!roomId) {
          return callback({ error: 'Room ID required for admin' });
        }

        room = await ChatRoom.findById(roomId);
        
        if (!room) {
          return callback({ error: 'Room not found' });
        }
      } else {
        return callback({ error: 'Invalid user role' });
      }

      // Join socket room
      const socketRoom = `chat_${room._id}`;
      await socket.join(socketRoom);

      // Load last 50 messages
      const messages = await Message.find({ roomId: room._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      // Reverse to show oldest first
      messages.reverse();

      // Send acknowledgment with data
      callback({
        success: true,
        roomId: room._id,
        messages: messages
      });

      console.log(`User ${userId} joined room ${socketRoom}`);

    } catch (error) {
      console.error('join-chat error:', error);
      callback({ error: 'Failed to join chat' });
    }
  });
};

---

Create file: sockets/handlers/sendMessage.js

const ChatRoom = require('../../models/ChatRoom');
const Message = require('../../models/Message');

module.exports = (socket, chatNamespace) => {
  socket.on('send-message', async (data, callback) => {
    try {
      const { roomId, content } = data;

      // Validate input
      if (!roomId || !content) {
        return callback({ error: 'Room ID and content required' });
      }

      if (content.trim().length === 0) {
        return callback({ error: 'Message cannot be empty' });
      }

      if (content.length > 2000) {
        return callback({ error: 'Message too long (max 2000 characters)' });
      }

      // Verify room exists
      const room = await ChatRoom.findById(roomId);
      if (!room) {
        return callback({ error: 'Room not found' });
      }

      // Verify user has access to this room
      const userId = socket.userId;
      const userRole = socket.userRole;

      if (userRole === 'customer' && room.customerId.toString() !== userId) {
        return callback({ error: 'Access denied' });
      }

      // Create message
      const message = await Message.create({
        roomId: roomId,
        senderId: userId,
        senderRole: userRole,
        content: content.trim()
      });

      // Update room's last message time
      await ChatRoom.findByIdAndUpdate(roomId, {
        lastMessageAt: new Date()
      });

      // Prepare message object
      const messageData = {
        _id: message._id,
        roomId: message.roomId,
        senderId: message.senderId,
        senderRole: message.senderRole,
        content: message.content,
        createdAt: message.createdAt
      };

      // Emit to all users in the room
      const socketRoom = `chat_${roomId}`;
      chatNamespace.to(socketRoom).emit('new-message', messageData);

      // Send acknowledgment
      callback({
        success: true,
        message: messageData
      });

    } catch (error) {
      console.error('send-message error:', error);
      callback({ error: 'Failed to send message' });
    }
  });
};

CRITICAL RULES:
- ALWAYS use callbacks for acknowledgments
- Validate ALL inputs before database operations
- Verify user access to room on EVERY event
- Trim content and check length
- Use lean() for read-only queries
- Update room.lastMessageAt on every message
- Emit to socket room, not individual sockets

Frontend Web – Phase 1 Prompts
Socket Client Service
Create file: src/services/socketService.js

import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect(token) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

    this.socket = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  emit(event, data, callback) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      if (callback) callback({ error: 'Not connected' });
      return;
    }

    this.socket.emit(event, data, callback);
  }

  on(event, handler) {
    if (this.socket) {
      this.socket.on(event, handler);
    }
  }

  off(event, handler) {
    if (this.socket) {
      this.socket.off(event, handler);
    }
  }
}

export default new SocketService();

CRITICAL RULES:
- Check connection status before emitting
- Use singleton pattern (export instance, not class)
- Always provide error callbacks
- Clean up listeners on disconnect
UI Components
Create file: src/components/Chat/ChatWidget.jsx

import React, { useState } from 'react';
import ChatWindow from './ChatWindow';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: '#007bff',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: 24
          }}
        >
          💬
        </button>
      )}
      {isOpen && (
        <ChatWindow onClose={() => setIsOpen(false)} />
      )}
    </div>
  );
};

export default ChatWidget;

---

Create file: src/components/Chat/ChatWindow.jsx

import React, { useState, useEffect, useRef } from 'react';
import socketService from '../../services/socketService';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

const ChatWindow = ({ onClose }) => {
  const [messages, setMessages] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  useEffect(() => {
    // Get token from localStorage (adjust based on your auth)
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login first');
      onClose();
      return;
    }

    // Connect socket
    socketService.connect(token);

    // Wait a bit for connection, then join chat
    setTimeout(() => {
      socketService.emit('join-chat', {}, (response) => {
        setIsLoading(false);
        if (response.error) {
          alert('Failed to join chat: ' + response.error);
          return;
        }
        setRoomId(response.roomId);
        setMessages(response.messages);
        setConnectionStatus('connected');
      });
    }, 500);

    // Listen for new messages
    const handleNewMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };

    socketService.on('new-message', handleNewMessage);

    // Cleanup
    return () => {
      socketService.off('new-message', handleNewMessage);
      socketService.disconnect();
    };
  }, [onClose]);

  const handleSendMessage = (content) => {
    if (!roomId) return;

    socketService.emit('send-message', 
      { roomId, content },
      (response) => {
        if (response.error) {
          alert('Failed to send: ' + response.error);
        }
        // Message will appear via new-message event
      }
    );
  };

  return (
    <div style={{
      width: 350,
      height: 500,
      background: 'white',
      borderRadius: 10,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: 15,
        background: '#007bff',
        color: 'white',
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>Customer Support</span>
        <button onClick={onClose} style={{
          background: 'none',
          border: 'none',
          color: 'white',
          fontSize: 20,
          cursor: 'pointer'
        }}>×</button>
      </div>

      {/* Status */}
      {connectionStatus !== 'connected' && (
        <div style={{ padding: 10, background: '#fff3cd', textAlign: 'center' }}>
          {isLoading ? 'Connecting...' : 'Disconnected'}
        </div>
      )}

      {/* Messages */}
      <MessageList messages={messages} />

      {/* Input */}
      <MessageInput onSend={handleSendMessage} disabled={!roomId} />
    </div>
  );
};

export default ChatWindow;

---

Create file: src/components/Chat/MessageList.jsx

import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

const MessageList = ({ messages }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: 15,
      background: '#f5f5f5'
    }}>
      {messages.length === 0 && (
        <div style={{ textAlign: 'center', color: '#999', marginTop: 50 }}>
          No messages yet. Start the conversation!
        </div>
      )}
      {messages.map(msg => (
        <MessageBubble key={msg._id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;

---

Create file: src/components/Chat/MessageBubble.jsx

import React from 'react';

const MessageBubble = ({ message }) => {
  const isCustomer = message.senderRole === 'customer';
  const currentUserId = localStorage.getItem('userId'); // Adjust based on your auth
  const isMine = message.senderId === currentUserId;

  return (
    <div style={{
      display: 'flex',
      justifyContent: isMine ? 'flex-end' : 'flex-start',
      marginBottom: 10
    }}>
      <div style={{
        maxWidth: '70%',
        padding: 10,
        borderRadius: 10,
        background: isMine ? '#007bff' : '#e9ecef',
        color: isMine ? 'white' : 'black',
        wordWrap: 'break-word'
      }}>
        <div style={{ fontSize: 14 }}>{message.content}</div>
        <div style={{
          fontSize: 10,
          marginTop: 5,
          opacity: 0.7
        }}>
          {new Date(message.createdAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;

---

Create file: src/components/Chat/MessageInput.jsx

import React, { useState } from 'react';

const MessageInput = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{
      padding: 15,
      borderTop: '1px solid #ddd',
      display: 'flex',
      gap: 10
    }}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a message..."
        disabled={disabled}
        style={{
          flex: 1,
          padding: 10,
          border: '1px solid #ddd',
          borderRadius: 20,
          outline: 'none'
        }}
      />
      <button
        type="submit"
        disabled={disabled || !input.trim()}
        style={{
          padding: '10px 20px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: 20,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1
        }}
      >
        Send
      </button>
    </form>
  );
};

export default MessageInput;

CRITICAL RULES:
- Always check authentication before connecting
- Use refs for auto-scroll
- Clean up socket listeners on unmount
- Show connection status to user
- Disable input when disconnected
- Handle errors gracefully with user feedback

Mobile (React Native) – Phase 1 Prompts
Create file: src/screens/ChatScreen.js

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Text,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    connectAndJoin();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const connectAndJoin = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        alert('Please login first');
        return;
      }

      const SOCKET_URL = 'http://YOUR_IP:5000'; // Change to your IP

      socketRef.current = io(`${SOCKET_URL}/chat`, {
        auth: { token },
        reconnection: true
      });

      socketRef.current.on('connect', () => {
        console.log('Connected to chat');
        
        socketRef.current.emit('join-chat', {}, (response) => {
          setIsLoading(false);
          if (response.error) {
            alert(response.error);
            return;
          }
          setRoomId(response.roomId);
          setMessages(response.messages);
        });
      });

      socketRef.current.on('new-message', (message) => {
        setMessages(prev => [...prev, message]);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setIsLoading(false);
      });

    } catch (error) {
      console.error('Setup error:', error);
      setIsLoading(false);
    }
  };

  const sendMessage = () => {
    if (!input.trim() || !roomId) return;

    const content = input.trim();
    setInput('');

    socketRef.current.emit('send-message',
      { roomId, content },
      (response) => {
        if (response.error) {
          alert(response.error);
          setInput(content); // Restore input
        }
      }
    );
  };

  const renderMessage = ({ item }) => {
    const isMine = item.senderRole === 'customer'; // Adjust based on user role

    return (
      <View style={[
        styles.messageBubble,
        isMine ? styles.myMessage : styles.theirMessage
      ]}>
        <Text style={styles.messageText}>{item.content}</Text>
        <Text style={styles.messageTime}>
          {new Date(item.createdAt).toLocaleTimeString()}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Connecting to chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!input.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    color: '#666'
  },
  messagesList: {
    padding: 15
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007bff'
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#e9ecef'
  },
  messageText: {
    fontSize: 14,
    color: '#000'
  },
  messageTime: {
    fontSize: 10,
    marginTop: 5,
    opacity: 0.7
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: 'white'
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    maxHeight: 100
  },
  sendButton: {
    backgroundColor: '#007bff',
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: 'center'
  },
  sendButtonDisabled: {
    opacity: 0.5
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold'
  }
});

export default ChatScreen;

CRITICAL RULES:
- Use AsyncStorage for token management
- Replace YOUR_IP with actual local IP for testing
- Clean up socket on unmount
- Auto-scroll on new messages
- Show loading state during connection

Phase 1 Exit Criteria & Testing
Testing Checklist
Before moving to Phase 2, verify:

1. REST API Independence:
   □ Can access /api/health without Socket.IO running
   □ Existing routes work normally
   □ No timeout errors on regular API calls

2. Socket Connection:
   □ Socket connects successfully with valid token
   □ Socket rejects invalid/missing token
   □ Reconnection works after disconnect

3. Messaging Flow:
   □ Customer can send message
   □ Admin receives message in real-time
   □ Both see message history on join
   □ Messages persist in database

4. Error Handling:
   □ Graceful error messages (no crashes)
   □ Invalid roomId handled
   □ Empty message rejected
   □ Network errors recoverable

5. Database Integrity:
   □ No duplicate rooms for same customer
   □ Messages have correct timestamps
   □ Indexes working (check query performance)

TEST PROCEDURE:
1. Start server, verify health endpoint works
2. Open two browser tabs (customer + admin)
3. Send messages back and forth
4. Refresh page, verify history loads
5. Disconnect/reconnect, verify sync
6. Check MongoDB for correct data