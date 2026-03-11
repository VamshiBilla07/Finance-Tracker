import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';
import { usePointsSystem } from '../hooks/usePointsSystem';
import '../styles/components/TransferMoney.css';

const TransferMoney = ({ accounts = [], onTransferComplete }) => {
  const { darkMode } = useTheme();
  const { formatAmount } = useCurrency();
  const { addPoints } = usePointsSystem();
  
  // State variables
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  
  // Find account details by ID
  const getAccountById = (id) => accounts.find(account => account.id === id);
  
  // Toggle expansion
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      // Reset form on expand
      setFromAccount('');
      setToAccount('');
      setAmount('');
      setError('');
    }
  };
  
  // Handle transfer submission
  const handleTransfer = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!fromAccount) {
      setError('Please select a source account');
      return;
    }
    
    if (!toAccount) {
      setError('Please select a destination account');
      return;
    }
    
    if (fromAccount === toAccount) {
      setError('Source and destination accounts cannot be the same');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    const transferAmount = parseFloat(amount);
    const sourceAccount = getAccountById(fromAccount);
    
    if (!sourceAccount || sourceAccount.amount < transferAmount) {
      setError('Insufficient balance in source account');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      // Begin database transaction
      const { error: txError } = await supabase.rpc('transfer_money', {
        from_account_id: fromAccount,
        to_account_id: toAccount,
        transfer_amount: transferAmount
      });
      
      if (txError) throw txError;
      
      toast.success('Transfer completed successfully!');
      
      // Add points for making a transfer
      addPoints(5, 'Completed a transfer between accounts');
      
      // Reset form
      setFromAccount('');
      setToAccount('');
      setAmount('');
      setIsExpanded(false);
      
      // Notify parent component to refresh balances
      if (onTransferComplete) {
        onTransferComplete();
      }
      
    } catch (error) {
      console.error('Transfer error:', error);
      setError(error.message || 'Failed to complete transfer');
      toast.error('Transfer failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show the component if fewer than 2 accounts
  if (!accounts || accounts.length < 2) {
    return null;
  }

  return (
    <motion.div 
      className={`transfer-container ${darkMode ? 'dark-mode' : 'light-mode'}`}
      layout
    >
      <div 
        className="transfer-header"
        onClick={toggleExpand}
      >
        <div className="transfer-title">
          <div className="transfer-icon">🔄</div>
          <h3>Transfer Between Accounts</h3>
        </div>
        <button className="expand-button">
          {isExpanded ? '−' : '+'}
        </button>
      </div>
      
      {isExpanded && (
        <motion.div 
          className="transfer-form-container"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <form onSubmit={handleTransfer} className="transfer-form">
            {error && (
              <div className="transfer-error">
                {error}
              </div>
            )}
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fromAccount">From Account</label>
                <select 
                  id="fromAccount"
                  value={fromAccount}
                  onChange={(e) => setFromAccount(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="">Select source account</option>
                  {accounts.map(account => (
                    <option key={`from-${account.id}`} value={account.id}>
                      {account.balance_type?.icon || '💰'} {account.balance_type?.name} ({formatAmount(account.amount)})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="transfer-arrow">→</div>
              
              <div className="form-group">
                <label htmlFor="toAccount">To Account</label>
                <select 
                  id="toAccount"
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="">Select destination account</option>
                  {accounts.map(account => (
                    <option key={`to-${account.id}`} value={account.id}>
                      {account.balance_type?.icon || '💰'} {account.balance_type?.name} ({formatAmount(account.amount)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="amount">Amount</label>
              <div className="amount-input-wrapper">
                <span className="currency-symbol">₹</span>
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                className="cancel-button"
                onClick={() => setIsExpanded(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="transfer-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="transfer-button-spinner"></span>
                    Processing...
                  </>
                ) : 'Transfer Money'}
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </motion.div>
  );
};

export default TransferMoney;
