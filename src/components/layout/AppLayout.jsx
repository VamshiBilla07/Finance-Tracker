import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import '../../styles/global/global.css'; // Import global CSS
import '../../styles/components/AppLayout.css';

const AppLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { darkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const mainContentRef = useRef(null);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setIsSidebarOpen(false);

    // Scroll to top when route changes
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      const sidebar = document.querySelector('.sidebar');
      const menuToggle = document.querySelector('.menu-toggle');
      
      if (
        isSidebarOpen &&
        sidebar &&
        menuToggle &&
        !sidebar.contains(event.target) &&
        !menuToggle.contains(event.target)
      ) {
        setIsSidebarOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isSidebarOpen]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Page transition variants - fixed Y position
  const pageTransitionVariants = {
    initial: { 
      opacity: 0, 
      y: 20,
      position: 'absolute',
      width: '100%'
    },
    animate: { 
      opacity: 1, 
      y: 0,
      position: 'relative',
      width: '100%'
    },
    exit: { 
      opacity: 0, 
      y: -20, 
      position: 'absolute',
      width: '100%'
    }
  };

  return (
    <div className={`app-layout ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      {/* Sidebar for desktop */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-wrapper">
            <h1>💵 Finance Tracker</h1>
          </div>
          <button className="close-sidebar" onClick={toggleSidebar}>
            &times;
          </button>
        </div>

        <nav className="main-nav">
          <ul>
            <li>
              <NavLink to="/dashboard" className={({isActive}) => isActive ? 'active' : ''}>
                <span className="nav-icon">📊</span>
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink to="/add-income" className={({isActive}) => isActive ? 'active' : ''}>
                <span className="nav-icon">💰</span>
                Add Income
              </NavLink>
            </li>
            <li>
              <NavLink to="/add-expense" className={({isActive}) => isActive ? 'active' : ''}>
                <span className="nav-icon">💸</span>
                Add Expense
              </NavLink>
            </li>
            <li>
              <NavLink to="/balances" className={({isActive}) => isActive ? 'active' : ''}>
                <span className="nav-icon">🏦</span>
                Balances
              </NavLink>
            </li>
            <li>
              <NavLink to="/settings" className={({isActive}) => isActive ? 'active' : ''}>
                <span className="nav-icon">⚙️</span>
                Settings
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          {/* No theme toggle in footer */}
        </div>
      </aside>

      {/* Desktop header with theme toggle */}
      <div className="desktop-header">
        <button 
          className="theme-toggle-header" 
          onClick={toggleTheme} 
          aria-label="Toggle theme"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Mobile header */}
      <header className="mobile-header">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <div className={`menu-icon ${isSidebarOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
        <div className="logo-wrapper">
          <h1>💵 Finance Tracker</h1>
        </div>
      </header>

      {/* Main content area */}
      <main className="main-content" ref={mainContentRef}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageTransitionVariants}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile navigation - no theme toggle */}
      <nav className="mobile-nav">
        <ul>
          <li>
            <NavLink to="/dashboard" className={({isActive}) => isActive ? 'active' : ''}>
              <span className="nav-icon">📊</span>
              <span className="nav-label">Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/add-income" className={({isActive}) => isActive ? 'active' : ''}>
              <span className="nav-icon">💰</span>
              <span className="nav-label">Income</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/add-expense" className={({isActive}) => isActive ? 'active' : ''}>
              <span className="nav-icon">💸</span>
              <span className="nav-label">Expense</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/balances" className={({isActive}) => isActive ? 'active' : ''}>
              <span className="nav-icon">🏦</span>
              <span className="nav-label">Balances</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="overlay" 
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default AppLayout;