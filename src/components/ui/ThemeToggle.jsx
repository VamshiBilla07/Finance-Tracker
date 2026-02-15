import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import '../../styles/global/global.css';
import '../../styles/components/ThemeToggle.css';

const ThemeToggle = () => {
  const { darkMode, toggleTheme } = useTheme();
  
  return (
    <button 
      onClick={toggleTheme}
      className="theme-toggle-button"
      aria-label="Toggle theme"
    >
      {darkMode ? (
        // Sun icon for light mode
        <span className="toggle-icon">☀️</span>
      ) : (
        // Moon icon for dark mode
        <span className="toggle-icon">🌙</span>
      )}
    </button>
  );
};

export default ThemeToggle;
