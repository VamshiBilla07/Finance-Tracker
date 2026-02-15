import React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { saveSubscription } from '../services/notificationService';
import toast from 'react-hot-toast';
import '../styles/global/global.css';
import '../styles/components/NotificationSetup.css';

const NotificationSetup = () => {
  const [showPopup, setShowPopup] = useState(false);
  const { darkMode } = useTheme();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Check if notifications are already granted
  const [notificationStatus, setNotificationStatus] = useState(
    'Notification' in window ? Notification.permission : 'unavailable'
  );
  
  // Don't show notification button if already granted or denied
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationStatus(Notification.permission);
    }
  }, []);
  
  // If notifications are already granted, don't show the button
  if (notificationStatus === 'granted') {
    return null;
  }
  
  const handleSubscribe = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      toast.error('Your browser does not support notifications');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);
      
      if (permission === 'granted') {
        const reg = await navigator.serviceWorker.ready;
        
        // Replace with your actual VAPID public key
        const vapidPublicKey = 'BOz-QbnMdfT9fGYR90wCLsH-njpym9lK1H1dKijOvG-PxYA4RX9wgu55FrcnXVrTIgJgZjpLlQBYd44ZPF-dO9I';
        
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
        
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
        
        // Save subscription to Supabase
        const result = await saveSubscription(subscription);
        
        if (result.success) {
          toast.success('Notifications enabled successfully!');
        } else {
          throw new Error('Failed to save subscription');
        }
      } else if (permission === 'denied') {
        toast.error('Notification permission denied');
      }
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      toast.error('Failed to enable notifications. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Helper function to convert the VAPID key
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
      
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };
  
  return (
    <>
      <button
        onClick={() => setShowPopup(true)}
        className="notification-toggle-button"
      >
        🔔
      </button>

      <AnimatePresence>
        {showPopup && (
          <motion.div 
            className="notification-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className={`notification-modal ${darkMode ? 'dark' : 'light'}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <h2>Stay Updated!</h2>
              <div className="notification-icon">🔔</div>
              <p>
                Enable notifications to get:
              </p>
              <ul>
                <li>✅ Daily balance reminders</li>
                <li>✅ Bill payment alerts</li>
                <li>✅ Savings goal achievements</li>
                <li>✅ Smart financial tips</li>
              </ul>
              <div className="notification-actions">
                <button
                  className="notification-decline"
                  onClick={() => setShowPopup(false)}
                  disabled={isProcessing}
                >
                  Not Now
                </button>
                <button
                  className="notification-allow"
                  onClick={() => {
                    handleSubscribe();
                    setShowPopup(false);
                  }}
                  disabled={isProcessing}
                >
                  Enable Notifications
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NotificationSetup;
