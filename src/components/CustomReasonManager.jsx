import React, { useState, useEffect, useRef } from 'react';
import { getCategories } from '../services/categoryService';
import { 
  getCustomReasons, 
  createCustomReason, 
  updateCustomReason, 
  deleteCustomReason,
  debugCustomReasonsTable 
} from '../services/reasonService';
import '../styles/global/global.css';
import '../styles/components/CustomReasonManager.css';

const CustomReasonManager = ({ 
  reasonType = 'transaction', 
  type = 'expense',
  category = '', 
  onClose, 
  onReasonAdded,
  onReasonSelected
}) => {
  const [categories, setCategories] = useState([]);
  const [customReasons, setCustomReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedType, setSelectedType] = useState(type);
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
  const [debugResult, setDebugResult] = useState(null);
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

  // Debug on initial load
  useEffect(() => {
    const runDebug = async () => {
      const result = await debugCustomReasonsTable();
      setDebugResult(result);
      
      if (!result.success) {
        console.warn('Custom reasons table debug failed:', result);
        setErrorMessage(`Database issue: ${result.error || 'Unknown error'}`);
      }
    };
    
    runDebug();
  }, []);

  const getThemeConfig = () => {
    if (selectedType === 'income') {
      return {
        themeClass: 'theme-income',
        icon: '💰',
        title: 'Income Reasons',
        accentColor: '#10B981',
        backgroundGradient: 'var(--color-cardBg)',
        illustration: '💸 → 💰'
      };
    } else {
      return {
        themeClass: 'theme-expense',
        icon: '💸',
        title: 'Expense Reasons',
        accentColor: '#EF4444',
        backgroundGradient: 'var(--color-cardBg)',
        illustration: '💰 → 💸'
      };
    }
  };

  const themeConfig = getThemeConfig();

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
          type: selectedType
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
  }, [selectedType, reasonType]);

  const filteredReasons = customReasons
    .filter(reason => !selectedCategory || reason.category === selectedCategory)
    .filter(reason => !searchTerm || reason.reason_text.toLowerCase().includes(searchTerm.toLowerCase()));
  
  const commonReasons = {
    expense: {
      Food: ['Groceries', 'Restaurant', 'Fast Food', 'Coffee'],
      Shopping: ['Clothes', 'Electronics', 'Gifts', 'Home Goods'],
      Transportation: ['Gas', 'Car Maintenance', 'Public Transit', 'Ride Share'],
      Bills: ['Rent', 'Utilities', 'Internet', 'Phone Bill'],
      Health: ['Doctor Visit', 'Medicine', 'Insurance', 'Fitness']
    },
    income: {
      Salary: ['Monthly Salary', 'Bonus', 'Commission', 'Overtime'],
      Investment: ['Dividends', 'Interest', 'Capital Gains', 'Rental Income'],
      Freelance: ['Client Payment', 'Contract Work', 'Consulting Fee', 'Project Completion'],
      Other: ['Gift', 'Tax Refund', 'Side Hustle', 'Cash Back']
    }
  };

  const handleTypeChange = (type) => {
    setSelectedType(type);
    setSelectedCategory('');
    setNewReason('');
    setIsAdding(false);
    setEditingReason(null);
  };
  
  const handleAddReason = async () => {
    if (!newReason.trim() || !selectedCategory || submitting) return;
    
    try {
      setSubmitting(true);
      setErrorMessage('');
      
      const reasonData = {
        reason_text: newReason.trim(),
        category: selectedCategory,
        type: selectedType,
        reason_type: reasonType
      };
      
      console.log("Creating reason with data:", reasonData);
      
      let result;
      if (editingReason) {
        // Update existing reason
        result = await updateCustomReason(editingReason.id, reasonData);
      } else {
        // Create new reason
        result = await createCustomReason(reasonData);
      }
      
      if (!result || !result.success) {
        throw new Error(result?.error?.message || 'Failed to save reason');
      }
      
      // Success handling
      if (editingReason) {
        setCustomReasons(prevReasons => 
          prevReasons.map(reason => 
            reason.id === editingReason.id 
              ? { ...reason, reason_text: newReason, category: selectedCategory } 
              : reason
          )
        );
        setSuccessMessage('Reason updated successfully!');
      } else {
        if (!result.data || !result.data[0]) {
          throw new Error('No data returned from server');
        }
        
        setCustomReasons(prevReasons => [result.data[0], ...prevReasons]);
        
        // Notify parent component if provided
        if (onReasonAdded) {
          onReasonAdded(result.data[0]);
        }
        
        setSuccessMessage('Reason added successfully!');
      }
      
      // Reset form
      setNewReason('');
      setEditingReason(null);
      
      // Refocus input for fast multiple entries
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
      
    } catch (err) {
      console.error('Error saving reason:', err);
      setErrorMessage(err.message || 'Failed to save reason');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleQuickReasonSelect = (reason) => {
    setNewReason(reason);
    inputRef.current?.focus();
  };
  
  const handleEditReason = (reason) => {
    setEditingReason(reason);
    setNewReason(reason.reason_text);
    setActiveTab('add');
    // Focus after tab change
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
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
      setSuccessMessage('Reason deleted successfully!');
    } catch (err) {
      console.error('Error deleting reason:', err);
      setErrorMessage(err.message || 'Failed to delete reason');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleCancelEdit = () => {
    setEditingReason(null);
    setNewReason('');
  };

  return (
    <div 
      className={`custom-reason-manager ${themeConfig.themeClass}`}
      style={{ backgroundColor: themeConfig.backgroundGradient }}
    >
      <div className="reason-manager-header">
        <div className="reason-title-container">
          <div className="reason-icon pulse-animation">
            {themeConfig.icon}
          </div>
          <div className="reason-title-content">
            <h3 className="reason-manager-title">
              {editingReason ? 'Edit Reason' : themeConfig.title}
            </h3>
            <p className="reason-manager-subtitle">
              {selectedCategory ? `${selectedCategory} Reasons` : 'Custom Reasons'}
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
          <span className="tab-icon">{editingReason ? '✏️' : '➕'}</span>
          {editingReason ? 'Edit Reason' : 'Create New'}
        </button>
        <button 
          className={`tab-button ${activeTab === 'browse' ? 'active' : ''}`} 
          onClick={() => setActiveTab('browse')}
          disabled={loading}
        >
          <span className="tab-icon">🔍</span>
          Browse All
          {filteredReasons.length > 0 && (
            <span className="reason-count">{filteredReasons.length}</span>
          )}
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
                    <label htmlFor="reason-input">
                      {editingReason ? 'Edit Reason' : 'New Reason'}
                    </label>
                    <div className="input-container">
                      <input
                        id="reason-input"
                        ref={inputRef}
                        type="text"
                        value={newReason}
                        onChange={(e) => setNewReason(e.target.value)}
                        className="reason-input"
                        placeholder="Enter your reason..."
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
                    <div className="form-actions">
                      <div className="char-counter">
                        <span className={newReason.length > 40 ? "char-limit-near" : ""}>
                          {newReason.length}/50
                        </span>
                      </div>
                      {editingReason && (
                        <button 
                          type="button" 
                          className="cancel-edit-button" 
                          onClick={handleCancelEdit}
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Quick select section */}
                  {!editingReason && commonReasons[selectedType]?.[selectedCategory] && (
                    <div className="quick-select-section">
                      <h4>Quick Select</h4>
                      <div className="quick-reasons">
                        {commonReasons[selectedType][selectedCategory]?.map((reason, index) => (
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
                  
                  {/* Recent reasons section */}
                  {!editingReason && filteredReasons.length > 0 && (
                    <div className="recent-reasons-section">
                      <h4>Your Recent Reasons</h4>
                      <div className="recent-reasons">
                        {filteredReasons.slice(0, 5).map(reason => (
                          <div 
                            key={reason.id}
                            className="recent-reason-item"
                            onClick={() => handleQuickReasonSelect(reason.reason_text)}
                          >
                            <span className="recent-reason-text">{reason.reason_text}</span>
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
                      : "You haven't created any custom reasons yet"}
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
                          title="Use this reason"
                        >
                          Use
                        </button>
                        
                        <button
                          className="edit-reason-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditReason(reason);
                          }}
                          title="Edit reason"
                        >
                          ✏️
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

export default CustomReasonManager;
