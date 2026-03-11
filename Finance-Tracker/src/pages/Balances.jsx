import React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import TransferMoney from '../components/TransferMoney';
import '../styles/pages/Balances.css';
import '../styles/global/global.css';

const Balances = () => {
  const { darkMode } = useTheme();
  const { formatAmount } = useCurrency();
  
  // State for balances and UI
  const [balances, setBalances] = useState([]);
  const [balanceTypes, setBalanceTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('accounts');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editBalance, setEditBalance] = useState(null);
  const [totalBalance, setTotalBalance] = useState(0);
  const [changes, setChanges] = useState([]);
  
  // Form data for adding or editing balances
  const [formData, setFormData] = useState({
    balance_type_id: '',
    amount: '',
    note: ''
  });
  
  // Load balances and balance types on component mount
  useEffect(() => {
    loadBalancesAndTypes();
    loadRecentChanges();
  }, []);
  
  // Calculate total balance when balances change
  useEffect(() => {
    const total = balances.reduce((sum, balance) => sum + parseFloat(balance.amount || 0), 0);
    setTotalBalance(total);
  }, [balances]);
  
  // Load balances and balance types from database
  const loadBalancesAndTypes = async () => {
    try {
      setIsLoading(true);
      
      // Load balance types
      const { data: typeData, error: typeError } = await supabase
        .from('balance_types')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (typeError) throw typeError;
      
      // Load user balances with joined balance type info
      const { data: balanceData, error: balanceError } = await supabase
        .from('user_balances')
        .select(`
          id,
          amount,
          note,
          created_at,
          updated_at,
          balance_type_id,
          balance_type:balance_type_id (
            id,
            name,
            description,
            icon
          )
        `);
      
      if (balanceError) throw balanceError;
      
      setBalanceTypes(typeData || []);
      setBalances(balanceData || []);
      
      // Set default balance type for form
      if (typeData && typeData.length > 0) {
        setFormData(prev => ({ ...prev, balance_type_id: typeData[0].id }));
      }
      
    } catch (error) {
      console.error('Error loading balances data:', error);
      toast.error('Failed to load balances');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load recent changes to balances
  const loadRecentChanges = async () => {
    try {
      const { data, error } = await supabase
        .from('balance_history')
        .select(`
          id,
          balance_id,
          old_amount,
          new_amount,
          created_at,
          user_balance:balance_id (
            id,
            balance_type:balance_type_id (
              name,
              icon
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      setChanges(data || []);
    } catch (error) {
      console.error('Error loading balance history:', error);
    }
  };
  
  // Handle form submission for adding or editing balance
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.balance_type_id) {
      toast.error('Please select an account type');
      return;
    }
    
    if (!formData.amount || isNaN(parseFloat(formData.amount))) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const amount = parseFloat(formData.amount);
      
      if (editBalance) {
        // Update existing balance
        const { error } = await supabase
          .from('user_balances')
          .update({ 
            amount, 
            note: formData.note || null 
          })
          .eq('id', editBalance.id);
        
        if (error) throw error;
        
        toast.success(`${editBalance.balance_type.name} balance updated successfully!`);
        
      } else {
        // Check if balance type already exists
        const existingBalance = balances.find(b => b.balance_type_id === formData.balance_type_id);
        
        if (existingBalance) {
          toast.error('This account type already exists. Please edit the existing account instead.');
          setIsLoading(false);
          return;
        }
        
        // Add new balance
        const { error } = await supabase
          .from('user_balances')
          .insert([{ 
            balance_type_id: formData.balance_type_id, 
            amount,
            note: formData.note || null
          }]);
        
        if (error) throw error;
        
        const selectedType = balanceTypes.find(type => type.id === formData.balance_type_id);
        toast.success(`${selectedType ? selectedType.name : 'New'} account added successfully!`);
      }
      
      // Reset form and reload balances
      setFormData({
        balance_type_id: balanceTypes.length > 0 ? balanceTypes[0].id : '',
        amount: '',
        note: ''
      });
      
      setEditBalance(null);
      loadBalancesAndTypes();
      loadRecentChanges();
      setActiveTab('accounts'); // Switch back to accounts view
      
    } catch (error) {
      console.error('Error saving balance:', error);
      toast.error('Failed to save balance information');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle delete balance
  const handleDeleteBalance = async (balance) => {
    if (!confirm(`Are you sure you want to delete your ${balance.balance_type.name} account?`)) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('user_balances')
        .delete()
        .eq('id', balance.id);
      
      if (error) throw error;
      
      toast.success(`${balance.balance_type.name} account deleted successfully`);
      loadBalancesAndTypes();
      
    } catch (error) {
      console.error('Error deleting balance:', error);
      toast.error('Failed to delete account');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Edit balance
  const handleEditBalance = (balance) => {
    setEditBalance(balance);
    setFormData({
      balance_type_id: balance.balance_type_id,
      amount: balance.amount.toString(),
      note: balance.note || ''
    });
    setActiveTab('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Add this function to refresh balances after a transfer
  const handleTransferComplete = async () => {
    await loadBalancesAndTypes();
    loadRecentChanges();
    toast.success("Balances updated successfully!");
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };
  
  const tabVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };
  
  // Helper function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className={`balances-page ${darkMode ? 'dark' : 'light'}-mode`}>
      <div className="balances-container">
        <motion.div
          className="balances-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1>Financial Accounts</h1>
          <p>Manage your accounts and track your net worth</p>
        </motion.div>
        
        <div className="balances-content">
          <div className="balances-sidebar">
            {/* Profile or Icon Section */}
            <div className="balances-profile-container">
              <div className="balances-total-icon">
                <div className="total-balance-icon">💰</div>
                <h3 className="total-balance-value">{formatAmount(totalBalance)}</h3>
                <p className="total-balance-label">Total Balance</p>
              </div>
            </div>
            
            {/* Navigation Tabs - Similar to Settings page */}
            <nav className="balances-nav">
              <button 
                className={`nav-tab ${activeTab === 'accounts' ? 'active' : ''}`}
                onClick={() => setActiveTab('accounts')}
              >
                <span className="tab-icon">🏦</span>
                <span className="tab-label">My Accounts</span>
              </button>
              <button 
                className={`nav-tab ${activeTab === 'add' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('add');
                  setEditBalance(null);
                  setFormData({
                    balance_type_id: balanceTypes.length > 0 ? balanceTypes[0].id : '',
                    amount: '',
                    note: ''
                  });
                }}
              >
                <span className="tab-icon">➕</span>
                <span className="tab-label">Add Account</span>
              </button>
              <button 
                className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                <span className="tab-icon">📝</span>
                <span className="tab-label">History</span>
              </button>
            </nav>
            
            {/* Quick Actions Panel */}
            
          </div>
          
          <div className="balances-main">
            {/* Transfer Money Section - New Addition */}
            <TransferMoney 
              accounts={balances} 
              onTransferComplete={handleTransferComplete} 
            />

            {/* Accounts Tab */}
            <AnimatePresence mode="wait">
              {activeTab === 'accounts' && (
                <motion.div 
                  className="balances-panel"
                  key="accounts-panel"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={tabVariants}
                >
                  <div className="panel-header">
                    <h2>Your Accounts</h2>
                    <p>Manage your existing financial accounts</p>
                  </div>
                  
                  {isLoading ? (
                    <div className="loading-container">
                      <div className="loading-spinner"></div>
                      <p>Loading your accounts...</p>
                    </div>
                  ) : balances.length === 0 ? (
                    <motion.div 
                      className="empty-accounts"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <div className="empty-icon">🏦</div>
                      <h3>No Accounts Yet</h3>
                      <p>Add your first account to start tracking your finances</p>
                      <button 
                        className="primary-button"
                        onClick={() => setActiveTab('add')}
                      >
                        Add Your First Account
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div 
                      className="accounts-grid"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {balances.map(balance => (
                        <motion.div
                          key={balance.id}
                          className="account-card"
                          variants={itemVariants}
                          layoutId={`account-${balance.id}`}
                        >
                          <div className="account-header">
                            <div className="account-icon-wrapper">
                              <div className="account-icon">{balance.balance_type.icon || '💰'}</div>
                            </div>
                            <div className="account-amount">{formatAmount(balance.amount)}</div>
                          </div>
                          <div className="account-details">
                            <div className="account-name">{balance.balance_type.name}</div>
                            {balance.note && (
                              <div className="account-note">{balance.note}</div>
                            )}
                            <div className="account-updated">
                              <span className="update-label">Last updated:</span> {new Date(balance.updated_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="account-actions">
                            <button 
                              className="edit-button" 
                              onClick={() => handleEditBalance(balance)}
                              aria-label="Edit account"
                            >
                              Edit
                            </button>
                            <button 
                              className="delete-button" 
                              onClick={() => handleDeleteBalance(balance)}
                              aria-label="Delete account"
                            >
                              Delete
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              )}
              
              {/* Add/Edit Account Tab */}
              {activeTab === 'add' && (
                <motion.div
                  className="balances-panel"
                  key="add-panel"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={tabVariants}
                >
                  <div className="panel-header">
                    <h2>{editBalance ? 'Edit Account' : 'Add New Account'}</h2>
                    <p>{editBalance ? 'Update your existing account details' : 'Create a new account to track your finances'}</p>
                  </div>
                  
                  <div className="add-account-form-container">
                    <form onSubmit={handleSubmit} className="settings-form">
                      <div className="form-group">
                        <label htmlFor="balance_type_id">Account Type</label>
                        <select
                          id="balance_type_id"
                          value={formData.balance_type_id}
                          onChange={(e) => setFormData({...formData, balance_type_id: e.target.value})}
                          disabled={editBalance}
                        >
                          <option value="">Select Account Type</option>
                          {balanceTypes.map(type => (
                            <option key={type.id} value={type.id}>
                              {type.icon} {type.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="amount">Current Balance</label>
                        <input
                          type="number"
                          id="amount"
                          value={formData.amount}
                          onChange={(e) => setFormData({...formData, amount: e.target.value})}
                          placeholder="0.00"
                          required
                          step="0.01"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="note">Note (Optional)</label>
                        <textarea
                          id="note"
                          value={formData.note}
                          onChange={(e) => setFormData({...formData, note: e.target.value})}
                          placeholder="Add any notes about this account"
                          rows="3"
                        />
                      </div>
                      
                      <div className="form-actions">
                        <button 
                          type="button" 
                          className="cancel-button"
                          onClick={() => {
                            setActiveTab('accounts');
                            setEditBalance(null);
                          }}
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="primary-button"
                          disabled={isLoading}
                        >
                          {isLoading ? 'Saving...' : editBalance ? 'Update Account' : 'Add Account'}
                        </button>
                      </div>
                    </form>
                    
                    <div className="account-types-container">
                      <h3>Account Types</h3>
                      <div className="account-types-grid">
                        {balanceTypes.map(type => (
                          <div 
                            key={type.id} 
                            className={`account-type-card ${formData.balance_type_id === type.id ? 'selected' : ''}`}
                            onClick={() => setFormData({...formData, balance_type_id: type.id})}
                          >
                            <div className="account-type-icon">{type.icon}</div>
                            <div className="account-type-name">{type.name}</div>
                            {formData.balance_type_id === type.id && (
                              <div className="selected-indicator">✓</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* History Tab */}
              {activeTab === 'history' && (
                <motion.div 
                  className="balances-panel"
                  key="history-panel"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={tabVariants}
                >
                  <div className="panel-header">
                    <h2>Account History</h2>
                    <p>Track all changes made to your accounts over time</p>
                  </div>
                  
                  {isLoading ? (
                    <div className="loading-container">
                      <div className="loading-spinner"></div>
                      <p>Loading history...</p>
                    </div>
                  ) : changes.length === 0 ? (
                    <div className="empty-history">
                      <div className="empty-icon">📝</div>
                      <h3>No History Yet</h3>
                      <p>Changes to your accounts will appear here</p>
                    </div>
                  ) : (
                    <div className="history-timeline">
                      {changes.map(change => (
                        <motion.div 
                          key={change.id}
                          className="history-item"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="history-line"></div>
                          <div className="history-dot"></div>
                          <div className="history-content">
                            <div className="history-header">
                              <div className="history-account">
                                {change.user_balance?.balance_type?.icon || '💰'} {change.user_balance?.balance_type?.name || 'Account'}
                              </div>
                              <div className="history-date">{formatDate(change.created_at)}</div>
                            </div>
                            <div className="history-change">
                              <div className="history-old-amount">
                                {formatAmount(change.old_amount)}
                              </div>
                              <div className="history-arrow">→</div>
                              <div className="history-new-amount">
                                {formatAmount(change.new_amount)}
                              </div>
                            </div>
                            <div className="history-difference">
                              {parseFloat(change.new_amount) > parseFloat(change.old_amount) ? (
                                <span className="positive-change">+{formatAmount(parseFloat(change.new_amount) - parseFloat(change.old_amount))}</span>
                              ) : (
                                <span className="negative-change">-{formatAmount(parseFloat(change.old_amount) - parseFloat(change.new_amount))}</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Mobile Bottom Navbar */}
        <div className="bottom-navbar">
          <div className="bottom-navbar-tabs">
            <button 
              className={`bottom-navbar-tab ${activeTab === 'accounts' ? 'active' : ''}`}
              onClick={() => setActiveTab('accounts')}
            >
              <div className="tab-content">
                <span className="bottom-navbar-icon">🏦</span>
                <span className="bottom-navbar-label">Accounts</span>
              </div>
            </button>
            <button 
              className={`bottom-navbar-tab ${activeTab === 'add' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('add');
                setEditBalance(null);
                setFormData({
                  balance_type_id: balanceTypes.length > 0 ? balanceTypes[0].id : '',
                  amount: '',
                  note: ''
                });
              }}
            >
              <div className="tab-content">
                <span className="bottom-navbar-icon">➕</span>
                <span className="bottom-navbar-label">Add</span>
              </div>
            </button>
            <button 
              className={`bottom-navbar-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <div className="tab-content">
                <span className="bottom-navbar-icon">📝</span>
                <span className="bottom-navbar-label">History</span>
              </div>
            </button>
          </div>
          
          {/* Page title indicator */}
          <div className="bottom-navbar-title">
            <span className="current-page-icon">
              {activeTab === 'accounts' ? '🏦' : 
               activeTab === 'add' ? '➕' : '📝'}
            </span>
            <span className="current-page-name">
              {activeTab === 'accounts' ? 'Accounts' : 
               activeTab === 'add' ? (editBalance ? 'Edit Account' : 'Add Account') : 'History'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Balances;