import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { askFinanceAI } from '../services/ai/askFinanceAI';
import toast from 'react-hot-toast';
import '../styles/global/global.css';
import '../styles/components/AIAssistant.css';

const AIAssistant = ({ userData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState([
    "How can I improve my savings?",
    "What's a good budget strategy for me?",
    "How to reduce my expenses?",
    "Tips for investing my money",
    "How to track my spending better?"
  ]);
  const messagesEndRef = useRef(null);
  const { darkMode } = useTheme();
  
  // Scroll to bottom of chat whenever conversation updates
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation, isOpen]);
  
  // Handle AI query submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    // Add user message to conversation
    const userMessage = { role: 'user', content: query };
    setConversation(prev => [...prev, userMessage]);
    
    // Clear input and set loading state
    setQuery('');
    setIsLoading(true);
    
    try {
      // Get AI response
      const response = await askFinanceAI(query);
      
      // Add AI response to conversation
      const aiMessage = { role: 'assistant', content: response };
      setConversation(prev => [...prev, aiMessage]);
      
    } catch (error) {
      console.error("Error getting AI response:", error);
      toast.error("Sorry, I couldn't process your request. Please try again.");
      
      // Add error message to conversation
      const errorMessage = { 
        role: 'assistant', 
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        isError: true 
      };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle suggested question click
  const handleSuggestedQuestion = (question) => {
    setQuery(question);
    handleSubmit({ preventDefault: () => {} });
  };
  
  // Reset conversation
  const handleReset = () => {
    setConversation([]);
  };
  
  return (
    <>
      {/* Assistant Toggle Button */}
      <motion.button 
        className={`ai-assistant-toggle ${darkMode ? 'dark' : 'light'}`}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <span className="assistant-icon">💼</span>
        <span className="assistant-label">Finance Assistant</span>
      </motion.button>
      
      {/* Assistant Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className={`ai-assistant-panel ${darkMode ? 'dark-mode' : 'light-mode'}`}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="assistant-header">
              <div className="assistant-title">
                <div className="assistant-avatar">🤖</div>
                <div className="assistant-info">
                  <h2>Finance Assistant</h2>
                  <p>Ask me anything about your finances</p>
                </div>
              </div>
              <div className="assistant-controls">
                <button 
                  className="assistant-action-btn"
                  onClick={handleReset}
                  aria-label="Reset conversation"
                >
                  <span>🔄</span>
                </button>
                <button 
                  className="assistant-close-btn"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close assistant"
                >
                  <span>✕</span>
                </button>
              </div>
            </div>
            
            {/* Chat Area */}
            <div className="assistant-chat">
              {/* Welcome Message */}
              {conversation.length === 0 && (
                <div className="welcome-container">
                  <motion.div
                    className="welcome-message"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="welcome-icon">👋</div>
                    <h3>Hello{userData?.profile?.name ? `, ${userData.profile.name}` : ''}!</h3>
                    <p>I'm your personal finance assistant. How can I help you today?</p>
                  </motion.div>
                  
                  {/* Suggested Questions */}
                  <div className="suggested-questions">
                    <h4>You might want to ask:</h4>
                    <div className="question-chips">
                      {suggestedQuestions.map((question, index) => (
                        <motion.button
                          key={index}
                          className="question-chip"
                          onClick={() => handleSuggestedQuestion(question)}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                          whileHover={{ scale: 1.05, backgroundColor: darkMode ? 'rgba(139, 92, 246, 0.2)' : 'rgba(99, 102, 241, 0.2)' }}
                        >
                          {question}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Conversation Messages */}
              {conversation.length > 0 && (
                <div className="messages-container">
                  {conversation.map((message, index) => (
                    <motion.div
                      key={index}
                      className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'} ${message.isError ? 'error-message' : ''}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div className="message-avatar">
                        {message.role === 'user' ? '👤' : '🤖'}
                      </div>
                      <div className="message-content">
                        <p>{message.content}</p>
                        {message.role === 'assistant' && !message.isError && (
                          <div className="message-actions">
                            <button className="message-action">
                              <span>👍</span>
                            </button>
                            <button className="message-action">
                              <span>👎</span>
                            </button>
                            <button className="message-action">
                              <span>📋</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Loading indicator */}
                  {isLoading && (
                    <motion.div 
                      className="message assistant-message loading"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="message-avatar">🤖</div>
                      <div className="message-content">
                        <div className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Reference for auto-scroll */}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            
            {/* Input Area */}
            <form className="assistant-input" onSubmit={handleSubmit}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about your finances..."
                disabled={isLoading}
                className="assistant-query-input"
              />
              <button 
                type="submit" 
                className="assistant-send-btn"
                disabled={isLoading || !query.trim()}
              >
                {isLoading ? <span className="loading-spinner"></span> : '📤'}
              </button>
            </form>
            
            {/* Footer */}
            <div className="assistant-footer">
              <p>Powered by AI • Your data is secure and private</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistant;
