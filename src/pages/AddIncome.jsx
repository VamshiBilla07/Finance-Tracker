import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { usePointsSystem } from '../hooks/usePointsSystem';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { INCOME_CATEGORIES } from '../constants/categories';
import Modal from '../components/Modal';
import CustomReasonManager from '../components/CustomReasonManager';
import '../styles/pages/AddIncome.css';
import '../styles/global/global.css';

// Simple icon components
const BackArrowIcon = () => <span className="text-lg">←</span>;
const CalendarIcon = () => <span className="text-lg">📅</span>;
const NotesIcon = () => <span className="text-lg">📝</span>;

const AddIncome = () => {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const { updatePointsFromTransaction } = usePointsSystem();
  const { formatAmount, currency, symbol: currencySymbol } = useCurrency(); // Get currency symbol and formatAmount
  
  // Use our standardized income categories
  const categories = INCOME_CATEGORIES;
  
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category_id: '', // Changed from 'category' to 'category_id' for consistency
    date: new Date().toISOString().split('T')[0],
    recurring: false,
    frequency: 'monthly',
    paymentMethod: 'bank_transfer'
  });
  
  // Form state
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [animateAmount, setAnimateAmount] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitAttempted, setFormSubmitAttempted] = useState(false);
  const [customReason, setCustomReason] = useState(''); // Add this missing state

  // Modal state for custom reason manager
  const [isCustomReasonModalOpen, setIsCustomReasonModalOpen] = useState(false);

  // Income statistics with real data from database
  const [incomeStats, setIncomeStats] = useState({
    monthlyTotal: 0,
    averageIncome: 0,
    topIncomeSource: 'None',
    lastIncome: 'No recent income'
  });

  // AI tips for income
  const [aiTips, setAiTips] = useState([
    "Allocate at least 20% of your income directly to savings 💰",
    "Consider multiple income streams for financial security 📊",
    "Invest a portion of unexpected income for long-term growth 📈",
    "Track all income sources to identify growth opportunities ✅",
    "Review your income strategy quarterly for optimization 🔍"
  ]);

  // Custom reasons for income
  const [customReasons, setCustomReasons] = useState([]);

  // Add loading state for accounts
  const [accountsLoading, setAccountsLoading] = useState(true);

  // Hard-coded user ID since this is a single-user application
  const userId = '1'; // Replace with your actual user ID from your database

  // Fetch accounts from database
  useEffect(() => {
    const fetchAccounts = async () => {
      setAccountsLoading(true);

      try {
        console.log("Fetching accounts for single user...");

        // Modified query - only using columns that exist in the database
        const { data, error } = await supabase
          .from('user_balances')
          .select(`
            id,
            amount,
            balance_type_id,
            balance_types:balance_type_id (id, name, icon)
          `);

        if (error) {
          console.error("Error fetching accounts:", error);
          throw error;
        }

        console.log("Raw account data:", data);

        if (data && Array.isArray(data) && data.length > 0) {
          // Transform data for UI with available columns
          const formattedAccounts = data.map(account => ({
            id: account.id,
            name: account.balance_types?.name || 'Unnamed Account',
            balance: parseFloat(account.amount) || 0,
            icon: account.balance_types?.icon || '💰',
            balance_type_id: account.balance_type_id
          }));

          console.log('Formatted accounts:', formattedAccounts);
          setAccounts(formattedAccounts);

          // Select first account by default
          if (formattedAccounts.length > 0 && !selectedAccount) {
            setSelectedAccount(formattedAccounts[0].id);
          }
        } else {
          console.log("No accounts found");
        }
      } catch (error) {
        console.error('Failed to load accounts:', error);
        toast.error(`Failed to load accounts: ${error.message}`);
      } finally {
        setAccountsLoading(false);
      }
    };

    fetchAccounts();
    loadIncomeStats();
    loadCustomReasons();
  }, []); // No dependencies needed since we're not checking for authentication

  const loadIncomeStats = async () => {
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      // Using created_at instead of date
      const { data: monthlyData, error: monthlyError } = await supabase
        .from('transactions')
        .select('amount, category, created_at')
        .eq('type', 'income')
        .gte('created_at', firstDayOfMonth)
        .lte('created_at', lastDayOfMonth);

      if (monthlyError) throw monthlyError;

      const monthlyTotal = monthlyData.reduce((sum, income) =>
        sum + parseFloat(income.amount || 0), 0);

      const { data: allIncomeData, error: allIncomeError } = await supabase
        .from('transactions')
        .select('amount, category, created_at')
        .eq('type', 'income')
        .order('created_at', { ascending: false });

      if (allIncomeError) throw allIncomeError;

      const averageIncome = allIncomeData.length > 0
        ? allIncomeData.reduce((sum, income) => sum + parseFloat(income.amount || 0), 0) / allIncomeData.length
        : 0;

      const categoryCount = {};
      let topCategory = 'None';
      let maxCount = 0;

      allIncomeData.forEach(income => {
        const category = income.category || 'Other';
        categoryCount[category] = (categoryCount[category] || 0) + 1;

        if (categoryCount[category] > maxCount) {
          maxCount = categoryCount[category];
          topCategory = category;
        }
      });

      let lastIncome = 'No recent income';
      if (allIncomeData.length > 0) {
        const latestIncomeDate = new Date(allIncomeData[0].created_at);
        const diffTime = Math.abs(now - latestIncomeDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          lastIncome = 'Today';
        } else if (diffDays === 1) {
          lastIncome = 'Yesterday';
        } else {
          lastIncome = `${diffDays} days ago`;
        }
      }

      setIncomeStats({
        monthlyTotal,
        averageIncome,
        topIncomeSource: topCategory,
        lastIncome
      });

    } catch (error) {
      console.error('Error loading income statistics:', error);
    }
  };

  const loadCustomReasons = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_reasons')
        .select('*')
        .eq('reason_type', 'income')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && Array.isArray(data)) {
        setCustomReasons(data);
      }
    } catch (error) {
      console.error('Error loading income reasons:', error);
    }
  };

  const getCategoryTips = () => {
    switch (formData.category_id) {
      case 'salary':
        return "Consider setting up automatic transfers on payday to your savings account.";
      case 'investment':
        return "Reinvesting dividends can significantly boost your investment growth over time.";
      case 'gift':
        return "Consider investing at least half of unexpected financial gifts for long-term benefit.";
      case 'freelance':
        return "Set aside 25-30% of freelance income for taxes to avoid surprises at tax time.";
      case 'refund':
        return "Treat refunds as savings rather than extra spending money to improve financial health.";
      default:
        return "Track all income sources regularly to understand your complete financial picture.";
    }
  };

  const handleAccountSelect = (accountId) => {
    setSelectedAccount(accountId);
    if (formErrors.account) {
      setFormErrors({ ...formErrors, account: null });
    }
  };

  const handleCategorySelect = (categoryId) => {
    setFormData({ ...formData, category_id: categoryId });
    if (formErrors.category) {
      setFormErrors({ ...formErrors, category: null });
    }

    setCustomReason('');
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    const regex = /^[0-9]*\.?[0-9]*$/;

    if (value === '' || regex.test(value)) {
      setFormData({ ...formData, amount: value });
      setAnimateAmount(true);
      setTimeout(() => setAnimateAmount(false), 300);

      if (formErrors.amount) {
        setFormErrors({ ...formErrors, amount: null });
      }
    }
  };

  const handleReasonChange = (e) => {
    setCustomReason(e.target.value);
    if (formErrors.reason) {
      setFormErrors({ ...formErrors, reason: null });
    }
  };

  const handleAddCustomReason = () => {
    setIsCustomReasonModalOpen(true);
  };

  const handleReasonAdded = (newReason) => {
    setCustomReasons([newReason, ...customReasons]);
    setCustomReason(newReason.reason_text);

    if (formErrors.reason) {
      setFormErrors({ ...formErrors, reason: null });
    }

    new Audio('/sounds/click.mp3').play().catch(e => console.log('Sound play failed:', e));
    toast.success(`New reason "${newReason.reason_text}" added successfully!`);
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.amount = 'Please enter a valid amount';
    }

    if (!formData.category_id) {
      errors.category = 'Please select a category';
    }

    if (!customReason) {
      errors.reason = 'Please select or add a reason';
    }

    if (!selectedAccount) {
      errors.account = 'Please select an account';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setFormSubmitAttempted(true);

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Find the selected account object to get its details
      const selectedAcct = accounts.find(acc => acc.id === selectedAccount);
      if (!selectedAcct) throw new Error("Selected account not found");

      // Get category name from the categories array
      const categoryName = categories.find(cat => cat.id === formData.category_id)?.name || 'Other';

      // Create transaction data that matches the actual table schema
      // Note: using only created_at for timestamp
      const incomeData = {
        balance_type_id: selectedAcct.balance_type_id,
        amount: parseFloat(formData.amount),
        category: categoryName,
        type: 'income',
        note: formData.description || null,
        reason: customReason || null,
        created_at: new Date().toISOString()
      };

      console.log('Submitting income data:', incomeData);

      // Insert the income transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert([incomeData])
        .select();

      if (error) throw error;

      // Update account balance
      const newBalance = parseFloat(selectedAcct.balance) + parseFloat(formData.amount);

      const { error: updateError } = await supabase
        .from('user_balances')
        .update({ amount: newBalance })
        .eq('id', selectedAccount);

      if (updateError) throw updateError;

      // Update points based on this transaction (using updated usePointsSystem)
      await updatePointsFromTransaction(incomeData);
      
      new Audio('/sounds/success.mp3').play().catch(e => console.log('Sound play failed:', e));
      toast.success(`Income of ${formatAmount(formData.amount)} added successfully!`);
      navigate('/dashboard', { state: { message: 'Income added successfully!' } });
    } catch (error) {
      console.error('Error adding income:', error);
      toast.error(`Failed to add income: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredReasons = formData.category_id
    ? customReasons.filter(reason => !reason.category || reason.category === formData.category_id)
    : customReasons;

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className={`add-income-page ${darkMode ? 'dark' : 'light'}-mode`}>
      <div className="add-income-container">
        <motion.div
          className="add-income-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1>Add Income</h1>
          <p>Track your earnings to build your financial future</p>
        </motion.div>

        <div className="add-income-content">
          <motion.div
            className="add-income-sidebar"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="income-stats-panel">
              <div className="income-stat-item">
                <div className="income-stat-icon">💹</div>
                <div className="income-stat-details">
                  <div className="income-stat-label">This Month's Income</div>
                  <div className="income-stat-value">{formatAmount(incomeStats.monthlyTotal)}</div>
                </div>
              </div>

              <div className="income-stat-item">
                <div className="income-stat-icon">📈</div>
                <div className="income-stat-details">
                  <div className="income-stat-label">Average Income</div>
                  <div className="income-stat-value">{formatAmount(incomeStats.averageIncome)}</div>
                </div>
              </div>

              <div className="income-stat-item">
                <div className="income-stat-icon">🔝</div>
                <div className="income-stat-details">
                  <div className="income-stat-label">Top Income Source</div>
                  <div className="income-stat-value">{incomeStats.topIncomeSource}</div>
                </div>
              </div>

              <div className="income-stat-item">
                <div className="income-stat-icon">⏱️</div>
                <div className="income-stat-details">
                  <div className="income-stat-label">Last Income Received</div>
                  <div className="income-stat-value">{incomeStats.lastIncome}</div>
                </div>
              </div>
            </div>

            <div className="ai-tips-panel">
              <div className="ai-tips-header">
                <div className="ai-tips-icon">💡</div>
                <div className="ai-tips-title">Smart Earning Tips</div>
              </div>

              {aiTips.map((tip, index) => (
                <div className="ai-tip-item" key={index}>
                  <div className="ai-tip-text">{tip}</div>
                </div>
              ))}

              {formData.category_id && (
                <motion.div
                  className="ai-tip-item"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="ai-tip-text">
                    <strong>{categories.find(c => c.id === formData.category_id)?.name} tip:</strong> {getCategoryTips()}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          <motion.div
            className="add-income-main"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <form className="add-income-form-panel" onSubmit={handleSubmit}>
              <div className="form-section">
                <h3>Income Details</h3>

                <div className="form-group amount-group">
                  <label htmlFor="amount">Amount</label>
                  <div className="amount-input">
                    <span className="currency-symbol">{currencySymbol || '₹'}</span>
                    <motion.input
                      animate={animateAmount ? { scale: [1, 1.03, 1] } : {}}
                      type="text"
                      id="amount"
                      name="amount"
                      value={formData.amount}
                      onChange={handleAmountChange}
                      placeholder="0.00"
                      disabled={isSubmitting}
                      className={formSubmitAttempted && formErrors.amount ? "error-border" : ""}
                    />
                    {animateAmount && (
                      <motion.span
                        className="money-emoji"
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: [0, 1, 0], y: [-10, -20], scale: 1 }}
                        transition={{ duration: 0.7 }}
                      >
                        💰
                      </motion.span>
                    )}
                  </div>
                  {formSubmitAttempted && formErrors.amount && (
                    <div className="field-error-message">{formErrors.amount}</div>
                  )}
                </div>

                <div className="form-group">
                  <label>Income Category</label>
                  <div className="category-grid">
                    {categories.map(category => (
                      <div
                        key={category.id}
                        onClick={() => setFormData({...formData, category_id: category.id})}
                        className={`category-item ${formData.category_id === category.id ? 'selected' : ''}`}
                        style={{
                          borderColor: formData.category_id === category.id ? category.color : 'transparent',
                          backgroundColor: formData.category_id === category.id ? `${category.color}15` : 'transparent'
                        }}
                      >
                        <div className="category-icon" style={{ backgroundColor: category.color }}>
                          {category.icon}
                        </div>
                        <div className="category-name">{category.name}</div>
                        {formData.category_id === category.id && (
                          <div className="category-selected-indicator"></div>
                        )}
                      </div>
                    ))}
                  </div>
                  {formSubmitAttempted && formErrors.category && (
                    <div className="field-error-message">{formErrors.category}</div>
                  )}
                </div>

                <div className="form-group custom-reason-group">
                  <div className="reason-label-container">
                    <label htmlFor="customReason">Reason</label>
                    <motion.button
                      type="button"
                      className="add-custom-reason-btn"
                      onClick={handleAddCustomReason}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={!formData.category_id}
                    >
                      + Add Custom Reason
                    </motion.button>
                  </div>
                  <div className="reason-select-container">
                    <select
                      id="customReason"
                      name="customReason"
                      value={customReason}
                      onChange={handleReasonChange}
                      disabled={isSubmitting || !formData.category_id}
                      className={`reason-select ${formSubmitAttempted && formErrors.reason ? "error-border" : ""}`}
                    >
                      <option value="">Select a reason</option>
                      {filteredReasons.map((reason) => (
                        <option key={reason.id} value={reason.reason_text}>
                          {reason.reason_text}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formSubmitAttempted && formErrors.reason && (
                    <div className="field-error-message">{formErrors.reason}</div>
                  )}
                  {formData.category_id && filteredReasons.length === 0 && (
                    <motion.div
                      className="no-reasons-message"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <span className="no-reasons-icon">📝</span>
                      <span>No reasons found for this category. Add a custom reason.</span>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="form-section">
                <h3>Payment Details</h3>

                <div className="form-group">
                  <label>Select Account</label>
                  {accountsLoading ? (
                    <div className="accounts-loading">
                      <p>Loading your accounts...</p>
                      <div className="spinner"></div>
                    </div>
                  ) : accounts && accounts.length > 0 ? (
                    <div className={`accounts-grid ${formSubmitAttempted && formErrors.account ? "error-container" : ""}`}>
                      {accounts.map((account) => (
                        <motion.div
                          key={account.id}
                          whileHover={{ y: -4, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleAccountSelect(account.id)}
                          className={`account-card ${selectedAccount === account.id ? 'selected' : ''}`}
                          style={{
                            borderColor: selectedAccount === account.id ? 'var(--color-success)' :
                              formSubmitAttempted && formErrors.account ? 'var(--color-error)' : 'var(--color-border)'
                          }}
                        >
                          <div className="account-icon">{account.icon || '💰'}</div>
                          <div className="account-details">
                            <div className="account-name">{account.name}</div>
                            <div className="account-balance">{formatAmount(account.balance)}</div>
                          </div>
                          {selectedAccount === account.id && (
                            <motion.div
                              className="account-check"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 15 }}
                            >
                              ✓
                            </motion.div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-accounts-message">
                      <p>No accounts found. Please add an account first.</p>
                      <button
                        type="button"
                        className="add-account-btn"
                        onClick={() => navigate('/balances')}
                      >
                        + Add Account
                      </button>
                    </div>
                  )}
                  {formSubmitAttempted && formErrors.account && (
                    <div className="field-error-message">{formErrors.account}</div>
                  )}
                </div>

                <div className="form-group date-group">
                  <label htmlFor="date">Transaction Date</label>
                  <div className="date-input-container">
                    <span className="date-icon">📅</span>
                    <input
                      type="date"
                      id="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="date-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="description">Notes (Optional)</label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Add any additional notes here..."
                    className="notes-textarea"
                    rows="3"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => navigate(-1)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  className="submit-button"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="button-spinner"></span>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <span>Add Income</span>
                      <span className="submit-icon">💰</span>
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>

      <Modal
        isOpen={isCustomReasonModalOpen}
        onClose={() => setIsCustomReasonModalOpen(false)}
      >
        <CustomReasonManager
          reasonType="income"
          category={formData.category_id}
          onClose={() => setIsCustomReasonModalOpen(false)}
          onReasonAdded={handleReasonAdded}
        />
      </Modal>
    </div>
  );
};

export default AddIncome;