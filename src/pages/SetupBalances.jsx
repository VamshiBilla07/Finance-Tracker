import { useState, useEffect } from 'react';
import '../styles/global/global.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import toast from 'react-hot-toast';
import '../styles/pages/SetupBalances.css';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import TransferMoney from '../components/TransferMoney';

const SetupBalances = () => {
  const { darkMode } = useTheme();
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();
  
  const [balances, setBalances] = useState([]);
  const [newBalance, setNewBalance] = useState({
    name: '',
    icon: '💰',
    balance: '',
    color: '#6366f1'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalBalance, setTotalBalance] = useState(0);
  const [balanceTypes, setBalanceTypes] = useState([]);
  const [activeTab, setActiveTab] = useState('accounts');

  // Available icons for selection
  const availableIcons = ['💰', '💵', '💳', '🏦', '🏠', '🚗', '💻', '📱', '🛒', '🎮', '✈️', '🏛️', '👛'];

  useEffect(() => {
    fetchBalancesAndTypes();
  }, []);

  const fetchBalancesAndTypes = async () => {
    try {
      setIsLoading(true);
      
      const { data: balancesData, error: balancesError } = await supabase
        .from('user_balances')
        .select(`
          id,
          amount,
          balance_type:balance_type_id (
            id,
            name,
            icon
          )
        `);
      
      if (balancesError) {
        console.error('Error fetching balances:', balancesError);
        throw balancesError;
      }
      
      const formattedBalances = balancesData.map(item => ({
        id: item.id,
        name: item.balance_type?.name || 'Account',
        icon: item.balance_type?.icon || '💰',
        balance: parseFloat(item.amount || 0),
        balance_type_id: item.balance_type?.id
      }));
      
      setBalances(formattedBalances);
      
      const total = formattedBalances.reduce((sum, item) => sum + item.balance, 0);
      setTotalBalance(total);
      
      const { data: typesData, error: typesError } = await supabase
        .from('balance_types')
        .select('*');
      
      if (typesError) {
        console.error('Error fetching balance types:', typesError);
        throw typesError;
      }
      
      setBalanceTypes(typesData || []);
    } catch (error) {
      console.error('Failed to load balances:', error);
      setError('Failed to load balances. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewBalance(prev => ({
      ...prev,
      [name]: name === 'balance' ? value.replace(/[^0-9.]/g, '') : value
    }));
  };

  const handleIconSelect = (icon) => {
    setNewBalance(prev => ({
      ...prev,
      icon: icon
    }));
    
    if (error && error.includes('icon')) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newBalance.name.trim()) {
      toast.error("Please enter a name for your balance");
      return;
    }
    
    if (!newBalance.balance) {
      toast.error("Please enter a balance amount");
      return;
    }

    if (!newBalance.icon) {
      toast.error("Please select an icon");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      if (isEditing && editId) {
        // Find balance type ID based on name
        const { data: balanceTypeData } = await supabase
          .from('balance_types')
          .select('id')
          .eq('name', newBalance.name)
          .single();
        
        if (!balanceTypeData) {
          throw new Error('Balance type not found');
        }
        
        // Update existing balance
        const { error: updateError } = await supabase
          .from('user_balances')
          .update({
            balance_type_id: balanceTypeData.id,
            amount: newBalance.balance
          })
          .eq('id', editId);
        
        if (updateError) throw updateError;
        toast.success('Balance updated successfully!');
      } else {
        // Create new balance
        let balanceTypeId;
        
        // Check if balance type already exists
        const { data: existingType } = await supabase
          .from('balance_types')
          .select('id')
          .eq('name', newBalance.name)
          .maybeSingle();
          
        if (!existingType) {
          // Create new balance type
          const { data: newTypeData, error: createTypeError } = await supabase
            .from('balance_types')
            .insert([{
              name: newBalance.name,
              icon: newBalance.icon || '💰',
              is_default: false
            }])
            .select('id')
            .single();
          
          if (createTypeError) throw createTypeError;
          balanceTypeId = newTypeData.id;
        } else {
          balanceTypeId = existingType.id;
        }
        
        // Insert new balance with balance type ID
        const { error: insertError } = await supabase
          .from('user_balances')
          .insert([{
            balance_type_id: balanceTypeId,
            amount: newBalance.balance
          }]);
        
        if (insertError) throw insertError;
        toast.success('New balance added successfully!');
      }
      
      await fetchBalancesAndTypes();
      
      // Reset form
      setNewBalance({
        name: '',
        icon: '💰',
        balance: '',
        color: '#6366f1'
      });
      setIsEditing(false);
      setEditId(null);
    } catch (err) {
      console.error('Error adding/updating balance:', err);
      setError(err.message || 'Failed to save balance');
      toast.error(err.message || 'Failed to save balance');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      const balanceToEdit = balances.find(balance => balance.id === id);
      
      if (balanceToEdit) {
        setNewBalance({
          name: balanceToEdit.name,
          icon: balanceToEdit.icon,
          balance: balanceToEdit.balance.toString(),
          color: balanceToEdit.color || '#6366f1'
        });
        setIsEditing(true);
        setEditId(id);
        setActiveTab('add');
      } else {
        toast.error("Balance not found");
      }
    } catch (err) {
      console.error("Error preparing edit:", err);
      toast.error("Failed to load balance data");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this balance?")) {
      try {
        setIsLoading(true);
        
        const { error: deleteError } = await supabase
          .from('user_balances')
          .delete()
          .eq('id', id);
        
        if (deleteError) throw deleteError;
        
        await fetchBalancesAndTypes();
        
        toast.success("Balance deleted successfully!");
      } catch (err) {
        console.error("Error deleting balance:", err);
        toast.error("Failed to delete balance");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle transfer completion - refresh balances
  const handleTransferComplete = async () => {
    await fetchBalancesAndTypes();
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

  return (
    <div className={`setup-page ${darkMode ? 'dark' : 'light'}-mode`}>
      <div className="balances-container">
        <motion.div
          className="balances-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1>Manage Your Balances</h1>
          <p>Add and manage different types of accounts and balances</p>
        </motion.div>
        
        <div className="balances-content">
          <div className="balances-sidebar">
            {/* Total Balance Container */}
            <div className="balances-profile-container">
              <div className="balances-total-icon">
                <div className="total-balance-icon">💰</div>
                <h3 className="total-balance-value">{formatAmount(totalBalance)}</h3>
                <p className="total-balance-label">Total Balance</p>
              </div>
            </div>
            
            {/* Add mobile account links - this will only show on mobile/tablet */}
            <div className="mobile-account-links">
              <button 
                className={`mobile-account-link ${activeTab === 'accounts' ? 'active' : ''}`}
                onClick={() => setActiveTab('accounts')}
              >
                <span className="mobile-link-icon">🏦</span>
                <span className="mobile-link-label">My Accounts</span>
              </button>
              <button 
                className={`mobile-account-link ${activeTab === 'add' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('add');
                  setIsEditing(false);
                  setEditId(null);
                  setNewBalance({
                    name: '',
                    icon: '💰',
                    balance: '',
                    color: '#6366f1'
                  });
                }}
              >
                <span className="mobile-link-icon">➕</span>
                <span className="mobile-link-label">Add Account</span>
              </button>
            </div>
            
            {/* Navigation Tabs - only shows on desktop */}
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
                  setIsEditing(false);
                  setEditId(null);
                  setNewBalance({
                    name: '',
                    icon: '💰',
                    balance: '',
                    color: '#6366f1'
                  });
                }}
              >
                <span className="tab-icon">➕</span>
                <span className="tab-label">Add Account</span>
              </button>
            </nav>
            
            
          </div>
          
          <div className="balances-main">
            {/* Transfer Money Component - New Addition */}
            {balances.length >= 2 && (
              <TransferMoney 
                accounts={balances.map(balance => ({
                  id: balance.id,
                  amount: balance.balance,
                  balance_type: {
                    name: balance.name,
                    icon: balance.icon
                  }
                }))} 
                onTransferComplete={handleTransferComplete} 
              />
            )}

            <AnimatePresence mode="wait">
              {/* Add Account Panel */}
              {activeTab === 'add' && (
                <motion.div 
                  key="add-panel"
                  className="add-balance-form"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={containerVariants}
                >
                  <h2>{isEditing ? 'Update Balance' : 'Add New Balance'}</h2>
                  
                  {error && (
                    <div className="alert alert-error">
                      <p>{error}</p>
                    </div>
                  )}
                  
                  <form className="balances-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label htmlFor="name">Account Name</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={newBalance.name}
                        onChange={handleInputChange}
                        placeholder="e.g., Savings Account"
                        className="form-input"
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="icon">Choose an Icon</label>
                      <div className="icon-selector">
                        {availableIcons.map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            className={`icon-button ${newBalance.icon === icon ? 'selected' : ''}`}
                            onClick={() => handleIconSelect(icon)}
                            disabled={isLoading}
                            aria-label={`Select ${icon} icon`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="balance">Current Balance</label>
                      <input
                        type="text"
                        id="balance"
                        name="balance"
                        value={newBalance.balance}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="form-input"
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="form-actions">
                      {isEditing && (
                        <button 
                          type="button" 
                          className="form-button cancel-button" 
                          onClick={() => {
                            setIsEditing(false);
                            setEditId(null);
                            setNewBalance({
                              name: '',
                              icon: '💰',
                              balance: '',
                              color: '#6366f1'
                            });
                          }}
                          disabled={isLoading}
                        >
                          Cancel
                        </button>
                      )}
                      
                      <button 
                        type="submit" 
                        className="form-button submit-button"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Processing...' : isEditing ? 'Update Balance' : 'Add Balance'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
              
              {/* Accounts Panel */}
              {activeTab === 'accounts' && (
                <motion.div 
                  key="accounts-panel"
                  className="balances-list"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={containerVariants}
                >
                  <div className="balances-header-row">
                    <h2>Your Balances</h2>
                    <div className="total-balance">
                      <span>Total: {formatAmount(totalBalance)}</span>
                    </div>
                  </div>
                  
                  {isLoading ? (
                    <div className="loading">Processing your request...</div>
                  ) : balances.length === 0 ? (
                    <div className="empty-state">
                      <p>You haven't added any balances yet.</p>
                      <p>Start by adding your first account!</p>
                    </div>
                  ) : (
                    <div className="balances-grid-list">
                      {balances.map(account => (
                        <motion.div
                          key={account.id}
                          className="balance-card"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          variants={itemVariants}
                        >
                          <div className="balance-card-content">
                            <div className="balance-icon">
                              {account.icon}
                            </div>
                            <div className="balance-details">
                              <h3>{account.name}</h3>
                              <p className="balance-amount">{formatAmount(account.balance)}</p>
                            </div>
                          </div>
                          <div className="balance-actions">
                            <button 
                              onClick={() => handleEdit(account.id)} 
                              className="action-button "
                              aria-label={`Edit ${account.name}`}
                              disabled={isLoading}
                            >
                              ✏️
                            </button>
                            <button 
                              onClick={() => handleDelete(account.id)} 
                              className="action-button delete-button"
                              aria-label={`Delete ${account.name}`}
                              disabled={isLoading}
                            >
                              🗑️
                            </button>
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
        
        
        
        {/* Background Overlay for Transfer Modal */}
        <AnimatePresence>
          {/* This will show when the transfer modal is open */}
          <motion.div 
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              display: document.querySelector('.transfer-modal') ? 'block' : 'none'
            }}
          />
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SetupBalances;