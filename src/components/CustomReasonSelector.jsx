import React, { useState, useEffect } from 'react';
import { getReasonsByTypeAndCategory } from '../services/reasonService';
import '../styles/global/global.css';
import '../styles/components/CustomReasonSelector.css';

const CustomReasonSelector = ({ 
  type = 'expense', 
  category = '', 
  value = '', 
  onChange, 
  onAddNewReason,
  disabled = false 
}) => {
  const [customReasons, setCustomReasons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFocused, setIsFocused] = useState(false);

  // Load custom reasons when type or category changes
  useEffect(() => {
    const loadReasons = async () => {
      // Don't load if no category selected
      if (!category) {
        setCustomReasons([]);
        return;
      }
      
      try {
        setLoading(true);
        
        const result = await getReasonsByTypeAndCategory(type, category);
        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to fetch custom reasons');
        }
        
        setCustomReasons(result.data);
      } catch (err) {
        console.error('Error loading custom reasons:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadReasons();
  }, [type, category]);

  // Handle reason selection change
  const handleReasonChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  // Handle add new reason click
  const handleAddReasonClick = () => {
    if (onAddNewReason && category) {
      onAddNewReason(type, category);
    }
  };

  return (
    <div className="custom-reason-selector">
      <div className="reason-label-container">
        <label htmlFor="custom-reason">
          <span className="reason-label-text">Reason</span>
          {category && <span className="reason-category-badge">{category}</span>}
        </label>
        <button 
          type="button"
          className="add-custom-reason-btn"
          onClick={handleAddReasonClick}
          disabled={!category || disabled}
        >
          <span className="add-icon">+</span>
          <span className="add-text">Add New</span>
        </button>
      </div>
      
      <div className="reason-select-wrapper">
        {!category ? (
          <div className="select-category-first-message">
            <span className="info-icon">ℹ️</span>
            <span>Select a category first</span>
          </div>
        ) : (
          <div className={`reason-input-container ${isFocused ? 'focused' : ''} ${disabled ? 'disabled' : ''}`}>
            <select
              id="custom-reason"
              className="reason-select"
              value={value}
              onChange={handleReasonChange}
              disabled={!category || disabled}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            >
              <option value="">Select a reason</option>
              {customReasons.map((reason) => (
                <option key={reason.id} value={reason.reason_text}>
                  {reason.reason_text}
                </option>
              ))}
            </select>
            <div className="select-arrow">▼</div>
          </div>
        )}
        
        {loading && (
          <div className="reason-loading">
            <div className="loading-spinner"></div>
            <span>Loading reasons...</span>
          </div>
        )}
        
        {error && <div className="reason-error">{error}</div>}
      </div>
      
      {category && customReasons.length === 0 && !loading && (
        <div className="no-reasons-message">
          <span className="no-reasons-icon">📝</span>
          <div className="no-reasons-content">
            <span className="no-reasons-title">No reasons yet</span>
            <span className="no-reasons-subtitle">Create your first custom reason!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomReasonSelector;
