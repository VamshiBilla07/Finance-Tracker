import React from 'react';
import { useState } from 'react';
import '../../styles/global/global.css';
import '../../styles/components/AIAssistant.css';

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="ai-assistant-container">
      {isOpen && (
        <div className="ai-assistant-chat">
          <div className="ai-assistant-header">
            <span>Finance AI Assistant</span>
            <button className="close-button" onClick={() => setIsOpen(false)}>×</button>
          </div>
          <div className="ai-assistant-body">
            <div className="ai-message">
              👋 Hello! I'm your Finance AI Assistant. How can I help you manage your finances today?
            </div>
          </div>
          <div className="ai-assistant-footer">
            <input 
              type="text" 
              placeholder="Ask me anything about your finances..."
              onKeyPress={(e) => e.key === 'Enter' && e.target.value.trim() !== '' && setIsOpen(true)} 
            />
            <button className="send-button">
              <span>➤</span>
            </button>
          </div>
        </div>
      )}
      <button 
        className="ai-assistant-button" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Assistant"
      >
        {!isOpen ? '🤖' : '×'}
      </button>
    </div>
  );
};

export default AIAssistant;
