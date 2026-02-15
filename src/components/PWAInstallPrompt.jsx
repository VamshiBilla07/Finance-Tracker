import React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import '../styles/global/global.css';
import '../styles/components/PWAInstallPrompt.css';

const PWAInstallPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      // Prevent the default browser prompt
      event.preventDefault();
      // Save the event for later
      setInstallPrompt(event);
      // Check if the user has dismissed the prompt before
      const hasPromptBeenDismissed = localStorage.getItem('pwaPromptDismissed');
      if (!hasPromptBeenDismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;

    // Show the browser install prompt
    installPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await installPrompt.userChoice;
    
    // Log outcome (either 'accepted' or 'dismissed')
    console.log(`User ${outcome} the installation`);
    
    // Reset the saved prompt since it can only be used once
    setInstallPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Save dismissal in localStorage so we don't prompt again
    localStorage.setItem('pwaPromptDismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <motion.div 
      className="pwa-prompt-container"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.3 }}
    >
      <div className="pwa-prompt-content">
        <div className="pwa-prompt-icon">📱</div>
        <div className="pwa-prompt-text">
          <h3>Install Finance Tracker</h3>
          <p>Add this app to your home screen for quick access and offline use.</p>
        </div>
        <div className="pwa-prompt-actions">
          <button 
            className="pwa-prompt-dismiss"
            onClick={handleDismiss}
          >
            Not now
          </button>
          <button 
            className="pwa-prompt-install"
            onClick={handleInstallClick}
          >
            Install
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default PWAInstallPrompt;
