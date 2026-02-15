import { Link } from 'react-router-dom';
import '../styles/global/global.css';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import '../styles/pages/NotFound.css';

const NotFound = () => {
  const { darkMode } = useTheme();
  
  return (
    <div className={`not-found-container ${darkMode ? 'dark' : 'light'}-mode`}>
      <motion.div 
        className="not-found-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="error-code">404</div>
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        
        <Link to="/dashboard" className="back-button">
          Back to Dashboard
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
