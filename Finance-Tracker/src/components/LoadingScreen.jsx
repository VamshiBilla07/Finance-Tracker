import React from 'react';
import { useTheme } from '../context/ThemeContext';
import '../styles/global/global.css';
import '../styles/components/LoadingScreen.css';

const LoadingScreen = () => {
  const { darkMode } = useTheme();
  
  return (
    <div className={`loading-screen ${darkMode ? 'dark' : 'light'}-mode`}>
      <div className="loading-spinner-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
