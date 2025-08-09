import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from './Layout';
import { getApiUrl } from '../config/api';
import './Dashboard.css';

const Chat = () => {
  const { isAdmin } = useAuth();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [starredMessages, setStarredMessages] = useState(() => {
    // Load starred messages from localStorage on component mount
    try {
      const savedStarredMessages = localStorage.getItem('starredMessages');
      return savedStarredMessages ? new Set(JSON.parse(savedStarredMessages)) : new Set();
    } catch (error) {
      console.error('Error loading starred messages from localStorage:', error);
      return new Set();
    }
  });

  const messagesEndRef = useRef(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatForCallSchedule, setChatForCallSchedule] = useState(null);

  // Fetch all chats for the user
  const fetchChats = async () => {
    try {
  
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('api/chats'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();

        setChats(data.chats || []);
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to fetch chats:', errorData);
        alert('Failed to load chats: ' + (errorData.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error fetching chats:', error);
      alert('Error loading chats. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a specific chat
  const fetchChatMessages = async (chatId) => {
    try {
  
      setOpeningChat(true);
      
      // First, try to find the chat in local state
      const localChat = chats.find(chat => chat._id === chatId);
      if (localChat) {

        setSelectedChat(localChat);
        setMessages(localChat.messages || []);
        scrollToBottom();
      }
      
      // Then fetch fresh data from server
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`api/chats/${chatId}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();

        
        if (data.chat) {
          setSelectedChat(data.chat);
          setMessages(data.chat.messages || []);
          
          scrollToBottom();
        } else {
          console.error('❌ No chat data in response');
          if (!localChat) {
            alert('Failed to load chat data');
          }
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to fetch chat messages:', errorData);
        if (!localChat) {
          alert(errorData.message || 'Failed to fetch chat messages');
        }
      }
    } catch (error) {
      console.error('❌ Error fetching chat messages:', error);
      if (!chats.find(chat => chat._id === chatId)) {
        alert('Error loading chat messages');
      }
    } finally {
      setOpeningChat(false);
    }
  };

  // Send a new message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`api/chats/${selectedChat._id}/messages`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          messageType: 'text'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.chat.messages || []);
        setNewMessage('');
        scrollToBottom();
        
        // Update the chat in the chats list
        setChats(prevChats => 
          prevChats.map(chat => 
            chat._id === selectedChat._id 
              ? { ...chat, messages: data.chat.messages, lastMessage: data.chat.lastMessage }
              : chat
          )
        );
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message');
    } finally {
      setSending(false);
    }
  };

  // Get chat for a specific call schedule
  const getChatForCallSchedule = async (callScheduleId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`api/chats/call-schedule/${callScheduleId}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setChatForCallSchedule(data.chat);
        setShowChatModal(true);
        setSelectedChat(data.chat);
        setMessages(data.chat.messages || []);
        scrollToBottom();
      } else {
        console.error('Failed to get chat for call schedule');
      }
    } catch (error) {
      console.error('Error getting chat for call schedule:', error);
    }
  };

  // Show delete confirmation modal
  const showDeleteConfirmation = (chat) => {
    setChatToDelete(chat);
    setShowDeleteModal(true);
  };

  // Delete a chat
  const deleteChat = async () => {
    if (!chatToDelete) return;



    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`api/chats/${chatToDelete._id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {

        
        // Remove the chat from the list
        setChats(prevChats => {
          const updatedChats = prevChats.filter(chat => chat._id !== chatToDelete._id);

          return updatedChats;
        });
        
        // If the deleted chat was selected, clear the selection
        if (selectedChat && selectedChat._id === chatToDelete._id) {
          setSelectedChat(null);
          setMessages([]);

        }
        
        // Show success message
        setTimeout(() => {
          alert('Chat deleted successfully from both frontend and backend!');
        }, 100);
      } else {
        const errorData = await response.json();
        console.error('❌ Backend: Failed to delete chat:', errorData);
        alert(errorData.message || 'Failed to delete chat');
      }
    } catch (error) {
      console.error('❌ Error deleting chat:', error);
      alert('Error deleting chat');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setChatToDelete(null);
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setChatToDelete(null);
  };

  // Toggle star status for a message
  const toggleStar = (messageId, e) => {
    e.stopPropagation();
    setStarredMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      
      // Save to localStorage
      try {
        localStorage.setItem('starredMessages', JSON.stringify([...newSet]));
      } catch (error) {
        console.error('Error saving starred messages to localStorage:', error);
      }
      
      return newSet;
    });
  };

  // Check if a message is starred
  const isStarred = (messageId) => {
    return starredMessages.has(messageId);
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);



  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Save starred messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('starredMessages', JSON.stringify([...starredMessages]));
    } catch (error) {
      console.error('Error saving starred messages to localStorage:', error);
    }
  }, [starredMessages]);

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading chats...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1>💬 Important Chat Management</h1>
            <p>Communicate with your leads and customers</p>
          </div>
        </div>

        <div className="chat-container">
          {/* Chat List */}
          <div className="chat-list">
            <div className="chat-list-header">
              <h3>Conversations</h3>
              <span className="chat-count">{chats.length}</span>
            </div>
            
            {chats.length > 0 ? (
              <div className="chat-items">
                {chats.map((chat) => (
                  <div
                    key={chat._id || `temp-${Math.random()}`}
                    className={`chat-item ${selectedChat?._id === chat._id ? 'active' : ''}`}
                    onClick={() => {

                      if (chat._id) {
                        // Prevent opening the same chat multiple times
                        if (selectedChat?._id === chat._id && !openingChat) {

                          return;
                        }
                        fetchChatMessages(chat._id);
                      } else {
                        console.error('❌ Chat ID is missing');
                        alert('Unable to open chat: Missing chat ID');
                      }
                    }}
                  >
                    <div className="chat-item-content">
                      <div className="chat-avatar">
                        <span>{(chat.participantName || chat.participantEmail || 'U').charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="chat-info">
                        <div className="chat-name">{chat.participantName || chat.participantEmail || 'Unknown User'}</div>
                        <div className="chat-preview">
                          {chat.messages && chat.messages.length > 0 && chat.messages[chat.messages.length - 1]?.content
                            ? (chat.messages[chat.messages.length - 1].content.length > 50 
                                ? chat.messages[chat.messages.length - 1].content.substring(0, 50) + '...'
                                : chat.messages[chat.messages.length - 1].content)
                            : 'No messages yet'}
                        </div>
                      </div>
                      <div className="chat-meta">
                        {chat.unreadCount > 0 && (
                          <div className="unread-badge">{chat.unreadCount}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-chat-list">
                <div className="empty-icon">💬</div>
                <h3>No conversations yet</h3>
                <p>Start chatting with your leads and customers</p>
              </div>
            )}
          </div>

          {/* Chat Messages */}
          <div className="chat-messages">
            {selectedChat ? (
              <>
                <div className="chat-header">
                  <div className="chat-participant">
                    <div className="chat-avatar">
                      <span>{selectedChat.participantName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="participant-info">
                      <h3>{selectedChat.participantName}</h3>
                      <p>{selectedChat.participantEmail}</p>
                      {selectedChat.participantId?.company && (
                        <span className="company">{selectedChat.participantId.company}</span>
                      )}
                    </div>
                  </div>
                  <div className="chat-header-actions">
                    {selectedChat.callScheduleId && (
                      <div className="call-schedule-info">
                        <span className="schedule-badge">
                          📞 {formatDate(selectedChat.callScheduleId.scheduledDate)}
                        </span>
                      </div>
                    )}

                    {isAdmin && (
                      <button
                        className="delete-chat-btn"
                        onClick={() => showDeleteConfirmation(selectedChat)}
                        disabled={deleting}
                        title="Delete this chat"
                      >
                        {deleting ? (
                          <div className="mini-spinner"></div>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="messages-container">
                  {messages.length > 0 ? (
                    messages.map((message, index) => (
                      <div
                        key={index}
                        className={`message ${message.sender === 'user' ? 'sent' : 'received'}`}
                      >
                        <div className="message-content">
                          <p>{message.content}</p>
                          <div className="message-footer">
                            <span className="message-time">
                              {formatTime(message.timestamp)}
                            </span>
                            <button
                              className={`message-star-btn ${isStarred(message._id || index) ? 'starred' : ''}`}
                              onClick={(e) => toggleStar(message._id || index, e)}
                              title={isStarred(message._id || index) ? 'Unstar this message' : 'Star this message'}
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-messages">
                      <div className="empty-icon">💬</div>
                      <h3>No messages yet</h3>
                      <p>Start the conversation with {selectedChat.participantName}</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={sendMessage} className="message-input">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    disabled={sending}
                  />
                  <button type="submit" disabled={!newMessage.trim() || sending}>
                    {sending ? (
                      <div className="mini-spinner"></div>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                      </svg>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="no-chat-selected">
                <div className="empty-icon">💬</div>
                <h3>Select a conversation</h3>
                <p>Choose a chat from the list to start messaging</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Modal for Call Schedule */}
        {showChatModal && chatForCallSchedule && (
          <div className="modal-overlay" onClick={() => setShowChatModal(false)}>
            <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Chat with {chatForCallSchedule.participantName}</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowChatModal(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="modal-chat-messages">
                {messages.length > 0 ? (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`message ${message.sender === 'user' ? 'sent' : 'received'}`}
                    >
                      <div className="message-content">
                        <p>{message.content}</p>
                        <span className="message-time">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-messages">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} className="modal-message-input">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  disabled={sending}
                />
                <button type="submit" disabled={!newMessage.trim() || sending}>
                  {sending ? (
                    <div className="mini-spinner"></div>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && chatToDelete && (
          <div className="modal-overlay" onClick={cancelDelete}>
            <div className="delete-confirmation-modal" onClick={(e) => e.stopPropagation()}>
              <div className="delete-modal-header">
                <div className="delete-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <h3>Delete Chat</h3>
                <button className="modal-close" onClick={cancelDelete}>
                  ✕
                </button>
              </div>
              
              <div className="delete-modal-content">
                <p>Are you sure you want to delete the chat with <strong>{chatToDelete.participantName}</strong>?</p>
                <p className="delete-warning">This action cannot be undone. All messages will be permanently removed.</p>
              </div>

              <div className="delete-modal-actions">
                <button 
                  className="btn-secondary"
                  onClick={cancelDelete}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button 
                  className="btn-danger"
                  onClick={deleteChat}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <div className="mini-spinner"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                      Delete Chat
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default Chat;