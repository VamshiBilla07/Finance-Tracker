import React, { createContext, useContext, useState, useEffect } from 'react';
import '../styles/global/global.css';
import toast from 'react-hot-toast';

const NotificationContext = createContext();

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [doNotDisturb, setDoNotDisturb] = useState(false);
  const [dndEndTime, setDndEndTime] = useState(null);

  // Initialize state from localStorage on component mount
  useEffect(() => {
    const notificationsEnabled = localStorage.getItem('notifications_enabled') !== 'false';
    const dndEnabled = localStorage.getItem('dnd_enabled') === 'true';
    const storedEndTime = localStorage.getItem('dnd_end_time');
    
    setIsEnabled(notificationsEnabled);
    
    if (dndEnabled && storedEndTime) {
      const endTime = new Date(storedEndTime);
      const now = new Date();
      
      if (endTime > now) {
        // DND is still active
        setDoNotDisturb(true);
        setDndEndTime(endTime);
        
        // Set timeout to disable DND when it expires
        const timeRemaining = endTime.getTime() - now.getTime();
        setTimeout(() => {
          setDoNotDisturb(false);
          setDndEndTime(null);
          localStorage.removeItem('dnd_end_time');
          localStorage.removeItem('dnd_enabled');
        }, timeRemaining);
      } else {
        // DND has expired
        localStorage.removeItem('dnd_end_time');
        localStorage.removeItem('dnd_enabled');
      }
    }
  }, []);

  // Send notification if enabled and not in DND mode
  const notify = (message, type = 'info') => {
    if (!isEnabled || doNotDisturb) return;
    
    switch (type) {
      case 'success':
        return toast.success(message);
      case 'error':
        return toast.error(message);
      case 'warning':
        return toast.custom((t) => (
          <div className={`custom-toast warning ${t.visible ? 'show' : ''}`}>
            ⚠️ {message}
          </div>
        ));
      default:
        return toast(message);
    }
  };

  // Value provided to the context
  const value = {
    isEnabled,
    doNotDisturb,
    dndEndTime,
    notify,
    enableNotifications: () => {
      setIsEnabled(true);
      localStorage.setItem('notifications_enabled', 'true');
    },
    disableNotifications: () => {
      setIsEnabled(false);
      localStorage.setItem('notifications_enabled', 'false');
    },
    toggleNotifications: () => {
      setIsEnabled(prev => {
        const newValue = !prev;
        localStorage.setItem('notifications_enabled', newValue.toString());
        return newValue;
      });
    },
    enableDoNotDisturb: (durationInMinutes) => {
      if (!durationInMinutes || durationInMinutes <= 0) return;
      
      const endTime = new Date();
      endTime.setMinutes(endTime.getMinutes() + durationInMinutes);
      
      setDndEndTime(endTime);
      setDoNotDisturb(true);
      localStorage.setItem('dnd_end_time', endTime.toISOString());
      localStorage.setItem('dnd_enabled', 'true');
      
      // Set timeout to disable DND when it expires
      setTimeout(() => {
        setDoNotDisturb(false);
        setDndEndTime(null);
        localStorage.removeItem('dnd_end_time');
        localStorage.removeItem('dnd_enabled');
      }, durationInMinutes * 60 * 1000);
    },
    disableDoNotDisturb: () => {
      setDoNotDisturb(false);
      setDndEndTime(null);
      localStorage.removeItem('dnd_end_time');
      localStorage.removeItem('dnd_enabled');
    }
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
