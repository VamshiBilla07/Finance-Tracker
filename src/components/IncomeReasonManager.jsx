import React, { useState, useEffect, useRef } from 'react';
import { getCategories } from '../services/categoryService';
import { getCustomReasons, createCustomReason, updateCustomReason, deleteCustomReason } from '../services/reasonService';
import '../styles/global/global.css';
import '../styles/components/IncomeReasonManager.css';

const IncomeReasonManager = ({ 
  reasonType = 'transaction', 
  category = '', 
  onClose, 
  onReasonAdded,
  onReasonSelected
}) => {
  const [categories, setCategories] = useState([]);
  const [customReasons, setCustomReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(category || '');
  const [newReason, setNewReason] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingReason, setEditingReason] = useState(null);
  const [activeTab, setActiveTab] = useState('add');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedReason, setExpandedReason] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (category) {
      setSelectedCategory(category);
    }
  }, [category]);

  useEffect(() => {
    if (selectedCategory && activeTab === 'add' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedCategory, activeTab]);

  useEffect(() => {
    let timer;
    if (successMessage) {
      timer = setTimeout(() => setSuccessMessage(''), 3000);
    }
    return () => clearTimeout(timer);
  }, [successMessage]);

  // Theme configuration
  const themeConfig = {
    themeClass: 'theme-income',
    icon: '💰',
    title: 'Income Reasons',
    accentColor: '#10B981',
    backgroundGradient: 'linear-gradient(135deg, #F0FDF4, #F0FDF4)',
    illustration: '💸 → 💰',
    solidBgColor: '#F0FDF4'
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        const categoriesResult = await getCategories();
        if (!categoriesResult.success) {
          throw new Error(categoriesResult.error?.message || 'Failed to fetch categories');
        }
        setCategories(categoriesResult.data);
        
        const reasonsResult = await getCustomReasons({ 
          reason_type: reasonType,
          type: 'income'
        });
        
        if (!reasonsResult.success) {
          throw new Error(reasonsResult.error?.message || 'Failed to fetch custom reasons');
        }
        setCustomReasons(reasonsResult.data);
        
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [reasonType]);

  const filteredReasons = customReasons
    .filter(reason => !selectedCategory || reason.category === selectedCategory)
    .filter(reason => !searchTerm || reason.reason_text.toLowerCase().includes(searchTerm.toLowerCase()));
  
  const commonReasons = {
    Salary: ['Monthly Salary', 'Bonus', 'Commission', 'Overtime'],
    Investment: ['Dividends', 'Interest', 'Capital Gains', 'Rental Income'],
    Freelance: ['Client Payment', 'Contract Work', 'Consulting Fee', 'Project Completion'],
    Other: ['Gift', 'Tax Refund', 'Side Hustle', 'Cash Back'],
    Business: ['Sales Revenue', 'Service Fee', 'Subscription Income', 'Digital Products'],
    Passive: ['Affiliate Marketing', 'YouTube Revenue', 'Royalties', 'Online Course']
  };
  
  const handleAddReason = async () => {
    if (!newReason.trim() || !selectedCategory || submitting) return;
    
    try {
      setSubmitting(true);
      setErrorMessage('');
      
      if (editingReason) {
        const result = await updateCustomReason(editingReason.id, {
          reason_text: newReason,
          category: selectedCategory,
          type: 'income',
          reason_type: reasonType
        });
        
        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to update reason');
        }
        
        setCustomReasons(prevReasons => 
          prevReasons.map(reason => 
            reason.id === editingReason.id 
              ? { ...reason, reason_text: newReason, category: selectedCategory } 
              : reason
          )
        );
      } else {
        const reasonData = {
          reason_text: newReason,
          category: selectedCategory,
          type: 'income',
          reason_type: reasonType
        };
        
        console.log("Creating income reason with data:", reasonData);
        
        const result = await createCustomReason(reasonData);
        
        if (!result || !result.success) {
          throw new Error(result?.error?.message || 'Failed to create income reason');
        }
        
        setCustomReasons(prevReasons => [result.data[0], ...prevReasons]);
        
        if (onReasonAdded) {
          onReasonAdded(result.data[0]);
        }
        
        setSuccessMessage('Reason added successfully!');
      }
      
      setNewReason('');
      setEditingReason(null);
    } catch (err) {
      console.error('Error adding/updating reason:', err);
      setErrorMessage(err.message || 'Failed to add reason');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleQuickReasonSelect = (reason) => {
    setNewReason(reason);
  };
  
  const handleSelectReason = (reason) => {
    if (onReasonSelected) {
      onReasonSelected(reason);
      onClose && onClose();
    }
  };

  const handleDeleteConfirm = async (id) => {
    try {
      setSubmitting(true);
      
      const result = await deleteCustomReason(id);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to delete reason');
      }
      
      setCustomReasons(prevReasons => prevReasons.filter(reason => reason.id !== id));
      setConfirmDelete(null);
    } catch (err) {
      console.error('Error deleting reason:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="income-reason-manager"
      style={{ backgroundColor: themeConfig.solidBgColor }}
    >
      <div 
        className="reason-manager-header" 
        style={{
          backgroundImage: `linear-gradient(135deg, ${themeConfig.accentColor}15, ${themeConfig.accentColor}05)`
        }}
      >
        <div className="reason-title-container">
          <div className="reason-icon pulse-animation">
            {themeConfig.icon}
          </div>
          <div className="reason-title-content">
            <h3 className="reason-manager-title">
              {themeConfig.title}
            </h3>
            <p className="reason-manager-subtitle">
              {selectedCategory ? `${selectedCategory} Reasons` : 'Custom Income Reasons'}
            </p>
          </div>
        </div>
        {onClose && (
          <button className="close-icon-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}
      </div>
      
      <div className="reason-manager-tabs">
        <button 
          className={`tab-button ${activeTab === 'add' ? 'active' : ''}`} 
          onClick={() => setActiveTab('add')}
        >
          <span className="tab-icon">✏️</span>
          Create New
        </button>
        <button 
          className={`tab-button ${activeTab === 'browse' ? 'active' : ''}`} 
          onClick={() => setActiveTab('browse')}
        >
          <span className="tab-icon">🔍</span>
          Browse All
        </button>
      </div>
      
      {(errorMessage || successMessage) && (
        <div className={`message-container ${errorMessage ? 'error' : 'success'}`}>
          <span className="message-icon">{errorMessage ? '⚠️' : '✅'}</span>
          <span className="message-text">{errorMessage || successMessage}</span>
          <button 
            className="message-close"
            onClick={() => errorMessage ? setErrorMessage('') : setSuccessMessage('')}
          >
            ✕
          </button>
        </div>
      )}
      
      <div className="reason-manager-content">
        {activeTab === 'add' ? (
          <div className="add-reason-section">
            <div className="reason-form">
              {selectedCategory ? (
                <>
                  <div className="selected-category-badge">
                    <span className="category-icon">{themeConfig.icon}</span>
                    <span className="category-name">{selectedCategory}</span>
                  </div>
                
                  <div className="form-group">
                    <label htmlFor="reason-input">Reason</label>
                    <div className="input-container">
                      <input
                        id="reason-input"
                        ref={inputRef}
                        type="text"
                        value={newReason}
                        onChange={(e) => setNewReason(e.target.value)}
                        className="reason-input"
                        placeholder="Enter your reason"
                        autoComplete="off"
                        maxLength={50}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newReason.trim()) {
                            handleAddReason();
                          }
                        }}
                      />
                      <button 
                        className="add-reason-button"
                        onClick={handleAddReason}
                        disabled={!newReason.trim() || submitting}
                      >
                        {submitting ? (
                          <div className="loading-spinner"></div>
                        ) : (
                          editingReason ? 'Update' : 'Add'
                        )}
                      </button>
                    </div>
                    <div className="char-counter">
                      <span className={newReason.length > 40 ? "char-limit-near" : ""}>
                        {newReason.length}/50
                      </span>
                    </div>
                  </div>
                  
                  {commonReasons[selectedCategory] && (
                    <div className="quick-select-section">
                      <h4>Quick Select</h4>
                      <div className="quick-reasons">
                        {commonReasons[selectedCategory]?.map((reason, index) => (
                          <div 
                            key={index}
                            className="quick-reason-item"
                            onClick={() => handleQuickReasonSelect(reason)}
                          >
                            {reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="no-category-selected">
                  <div className="illustration">
                    <span>{themeConfig.illustration}</span>
                  </div>
                  <div className="helper-text">
                    No category selected. Please select a category before adding reasons.
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="browse-reasons-section">
            <div className="search-container">
              <div className="search-icon">🔍</div>
              <input 
                type="text"
                className="search-input"
                placeholder="Search reasons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  className="clear-search"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            
            <div className="reasons-list">
              {loading ? (
                <div className="loading-state">
                  <div className="loading-spinner large"></div>
                  <p>Loading reasons...</p>
                </div>
              ) : filteredReasons.length === 0 ? (
                <div className="empty-reasons">
                  <span className="empty-icon">{themeConfig.icon}</span>
                  <h4>No reasons found</h4>
                  <p>
                    {searchTerm 
                      ? "No matching reasons for your search" 
                      : "You haven't created any income reasons yet"}
                  </p>
                  <button 
                    className="create-first-reason"
                    onClick={() => setActiveTab('add')}
                  >
                    Create your first reason
                  </button>
                </div>
              ) : (
                filteredReasons.map((reason) => (
                  <div 
                    key={reason.id} 
                    className={`reason-item ${expandedReason === reason.id ? 'expanded' : ''}`}
                  >
                    <div 
                      className="reason-content"
                      onClick={() => setExpandedReason(
                        expandedReason === reason.id ? null : reason.id
                      )}
                    >
                      <div className="reason-text-container">
                        <span className="reason-indicator"></span>
                        <span className="reason-text">
                          {reason.reason_text}
                        </span>
                      </div>
                      <div className="reason-actions">
                        <button 
                          className="select-reason-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectReason(reason);
                          }}
                        >
                          Select
                        </button>
                        {confirmDelete === reason.id ? (
                          <div className="confirm-delete" onClick={e => e.stopPropagation()}>
                            <button 
                              className="confirm-yes" 
                              onClick={() => handleDeleteConfirm(reason.id)}
                              disabled={submitting}
                            >
                              Yes
                            </button>
                            <button 
                              className="confirm-no" 
                              onClick={() => setConfirmDelete(null)}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button 
                            className="delete-reason-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDelete(reason.id);
                            }}
                            title="Delete reason"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                    {expandedReason === reason.id && (
                      <div className="reason-details">
                        <div className="detail-item">
                          <span className="detail-label">Category</span>
                          <span className="detail-value category-value">{reason.category}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Created</span>
                          <span className="detail-value">
                            {new Date(reason.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="reason-manager-actions">
        <button className="close-button" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
};

export default IncomeReasonManager;
