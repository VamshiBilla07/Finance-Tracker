import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { generateFinanceNotification } from '../services/ai/askFinanceAI';
import toast from 'react-hot-toast';
import '../styles/global/global.css';
import '../styles/components/Notifications.css';

const Notifications = () => {
  const { darkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(
    'Notification' in window ? Notification.permission === 'granted' : false
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationTypes = ['dailyTracking', 'savingReminder', 'budgetAlert', 'investmentTip'];
  
  // Check if notification permission is already granted and load notifications
  useEffect(() => {
    if (permissionGranted) {
      loadSavedNotifications();
    }
  }, [permissionGranted]);
  
  // Load saved notifications from localStorage
  const loadSavedNotifications = () => {
    try {
      const saved = localStorage.getItem('finance-notifications');
      if (saved) {
        const parsedNotifications = JSON.parse(saved);
        setNotifications(parsedNotifications);
        
        // Count unread notifications
        const unread = parsedNotifications.filter(n => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error loading saved notifications:', error);
    }
  };
  
  // Save notifications to localStorage
  const saveNotifications = (notifs) => {
    localStorage.setItem('finance-notifications', JSON.stringify(notifs));
  };
  
  // Show permission explanation modal
  const showPermissionPrompt = () => {
    setShowPermissionModal(true);
  };
  
  // Request notification permission - fix the permission request flow
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('This browser does not support desktop notifications');
      return;
    }
    
    try {
      // First check the current permission status
      let permission = Notification.permission;
      
      // If permission is not determined (default), request it
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      
      if (permission === 'granted') {
        setPermissionGranted(true);
        setShowPermissionModal(false);
        
        // Send initial welcome notification
        sendTestNotification('Welcome to Finance Tracker! You will now receive financial tips and reminders.');
        
        // Store that permission was granted
        localStorage.setItem('notification-permission-granted', 'true');
      } else {
        // Show error only if explicitly denied
        if (permission === 'denied') {
          toast.error('Notification permission was denied. Please enable it in your browser settings.');
        }
        setShowPermissionModal(false);
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to request notification permissions');
      setShowPermissionModal(false);
    }
  };
  
  // Add a new useEffect to check the actual browser permission status on component mount
  useEffect(() => {
    if ('Notification' in window) {
      // Check if permissions previously granted in this app
      const storedPermission = localStorage.getItem('notification-permission-granted');
      const currentPermission = Notification.permission;
      
      // Update state based on actual browser permission
      if (currentPermission === 'granted' || storedPermission === 'true') {
        setPermissionGranted(true);
      } else {
        setPermissionGranted(false);
      }
    }
  }, []);
  
  // Send a test notification - with improved error handling
  const sendTestNotification = (message) => {
    try {
      if (Notification.permission === 'granted') {
        // Create notification safely
        const notification = new Notification('Finance Tracker', {
          body: message,
          icon: '/logo192.png',
          tag: 'finance-tracker-notification' // Add tag to prevent duplicate notifications
        });
        
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
        
        // Also add to internal notifications
        addNotification(message);
        console.log('Notification sent successfully');
        return true;
      } else {
        console.log('Cannot send notification - permission not granted');
        return false;
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
      return false;
    }
  };
  
  // Add a notification to the list
  const addNotification = async (message = null) => {
    try {
      let notificationText = message;
      
      // If no message provided, generate one using AI
      if (!notificationText) {
        const randomType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
        notificationText = await generateFinanceNotification(randomType);
      }
      
      const newNotification = {
        id: Date.now(),
        text: notificationText,
        timestamp: new Date().toISOString(),
        read: false
      };
      
      const updatedNotifications = [newNotification, ...notifications.slice(0, 19)]; // Keep only 20 most recent
      setNotifications(updatedNotifications);
      saveNotifications(updatedNotifications);
      setUnreadCount(prev => prev + 1);
      
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = () => {
    if (notifications.length === 0) return;
    
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveNotifications(updated);
    setUnreadCount(0);
    
    toast.success('All notifications marked as read');
  };
  
  // Mark a specific notification as read
  const markAsRead = (id) => {
    const updated = notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    saveNotifications(updated);
    setUnreadCount(prev => Math.max(0, prev - 1));
  };
  
  // Toggle notifications panel
  const toggleNotifications = () => {
    setIsOpen(!isOpen);
  };
  
  // Generate test notifications periodically
  useEffect(() => {
    if (!permissionGranted) return;
    
    const interval = setInterval(() => {
      addNotification();
    }, 120000); // every 2 minutes
    
    return () => clearInterval(interval);
  }, [permissionGranted, notifications]);
  
  // Format relative time
  const timeAgo = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now - date) / 1000);
    
    let interval = seconds / 31536000; // seconds in a year
    if (interval > 1) return Math.floor(interval) + ' years ago';
    
    interval = seconds / 2592000; // seconds in a month
    if (interval > 1) return Math.floor(interval) + ' months ago';
    
    interval = seconds / 86400; // seconds in a day
    if (interval > 1) return Math.floor(interval) + ' days ago';
    
    interval = seconds / 3600; // seconds in an hour
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    
    interval = seconds / 60; // seconds in a minute
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    
    return Math.floor(seconds) + ' seconds ago';
  };
  
  // Add this debug function for checking permission issues
  const debugPermissionStatus = () => {
    if (!('Notification' in window)) {
      console.log('Notifications not supported in this browser');
      toast.error('Notifications not supported in this browser');
      return;
    }
    
    const permissionStatus = Notification.permission;
    console.log('Current permission status:', permissionStatus);
    toast.success(`Current permission status: ${permissionStatus}`);
    
    // If permission is denied, show instructions based on browser
    if (permissionStatus === 'denied') {
      const isChrome = navigator.userAgent.indexOf('Chrome') > -1;
      const isFirefox = navigator.userAgent.indexOf('Firefox') > -1;
      let message = 'Notification permission denied. ';
      
      if (isChrome) {
        message += 'To enable: Click the lock icon in the address bar → Site settings → Notifications → Allow';
      } else if (isFirefox) {
        message += 'To enable: Click the shield icon in the address bar → Site permissions → Notifications → Allow';
      } else {
        message += 'Please enable notifications in your browser settings.';
      }
      
      toast.error(message, { duration: 8000 });
      console.log(message);
    }
  };
  
  // Add a click handler for the notification icon when permissions are already granted
  const handleNotificationClick = () => {
    if (permissionGranted) {
      toggleNotifications();
    } else {
      // If permissions not granted, add debugging helper
      debugPermissionStatus();
      showPermissionPrompt();
    }
  };

  return (
    <div className={`notifications-container ${darkMode ? 'dark' : 'light'}-mode`}>
      {!permissionGranted ? (
        <button 
          className="notification-permission-btn"
          onClick={handleNotificationClick}
          aria-label="Enable notifications"
        >
          <span className="notification-icon">🔔</span>
          <span className="notification-text">Enable Notifications</span>
        </button>
      ) : (
        <>
          <button 
            className="notifications-toggle"
            onClick={toggleNotifications}
            aria-label="View notifications"
          >
            <span className="notification-icon">🔔</span>
            {unreadCount > 0 && 
              <span className="notification-badge">{unreadCount}</span>
            }
          </button>
          
          <AnimatePresence>
            {isOpen && (
              <motion.div 
                className="notifications-panel"
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div className="notifications-header">
                  <h3>Notifications</h3>
                  <button 
                    className="notifications-close"
                    onClick={toggleNotifications}
                    aria-label="Close notifications"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="notifications-list">
                  {notifications.length === 0 ? (
                    <div className="no-notifications">
                      <p>No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div 
                        key={notification.id} 
                        className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="notification-content">
                          <p>{notification.text}</p>
                          <span className="notification-time">{timeAgo(notification.timestamp)}</span>
                        </div>
                        {!notification.read && <div className="unread-marker" />}
                      </div>
                    ))
                  )}
                </div>
                
                {notifications.length > 0 && (
                  <div className="notifications-footer">
                    <button 
                      className="mark-all-read-btn"
                      onClick={markAllAsRead}
                    >
                      Mark all as read
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
      
      {/* Permission explanation modal */}
      <AnimatePresence>
        {showPermissionModal && (
          <motion.div 
            className="permission-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              // Close modal when clicking outside
              if (e.target === e.currentTarget) {
                setShowPermissionModal(false);
              }
            }}
          >
            <motion.div 
              className={`permission-modal ${darkMode ? 'dark' : 'light'}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="permission-modal-header">
                <h3>Enable Notifications</h3>
                <button 
                  className="modal-close-btn"
                  onClick={() => setShowPermissionModal(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="permission-modal-content">
                <div className="permission-icon">🔔</div>
                <p className="permission-title">Why enable notifications?</p>
                <ul className="permission-benefits">
                  <li>🌟 Get daily financial tips to improve your habits</li>
                  <li>💰 Receive reminders to save money regularly</li>
                  <li>⏰ Be alerted when you're close to budget limits</li>
                  <li>📈 Never miss important finance insights</li>
                </ul>
              </div>
              
              <div className="permission-modal-actions">
                <button 
                  className="cancel-btn"
                  onClick={() => setShowPermissionModal(false)}
                >
                  Not Now
                </button>
                <button 
                  className="allow-btn"
                  onClick={requestPermission}
                >
                  Enable Notifications
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Notifications;
