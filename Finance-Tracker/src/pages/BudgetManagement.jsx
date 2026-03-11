import { useState, useEffect } from 'react';
import '../styles/global/global.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { supabase } from '../services/supabaseClient';
import { usePointsSystem } from '../hooks/usePointsSystem';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import '../styles/pages/BudgetManagement.css';
import { EXPENSE_CATEGORIES, getCategoryById, CATEGORY_TO_BUDGET_MAP } from '../constants/categories';

const BudgetManagement = () => {
  const { darkMode } = useTheme();
  const { formatAmount } = useCurrency();
  const { addPoints } = usePointsSystem();
  
  // State variables
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonthYear, setCurrentMonthYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [expandedBudget, setExpandedBudget] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    duration: 30 // Default duration of 30 days
  });
  
  // Replace the categories array with our standardized categories
  const categories = EXPENSE_CATEGORIES;

  // Initialize current month/year on component load
  useEffect(() => {
    const now = new Date();
    const monthYear = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
    setCurrentMonthYear(monthYear);
    setSelectedMonth(monthYear);
    
    // Generate month options for the past year and coming 2 months
    generateMonthOptions();
  }, []);

  // Load budgets and expenses for the selected month
  useEffect(() => {
    if (selectedMonth) {
      loadBudgetsAndExpenses();
    }
  }, [selectedMonth]);

  // Generate month options for dropdown
  const generateMonthOptions = () => {
    const now = new Date();
    const months = [];
    
    // Past 11 months + current month + next 2 months
    for (let i = -11; i <= 2; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
      months.push(monthYear);
    }
    
    return months;
  };

  // Load budgets and expenses from database
  const loadBudgetsAndExpenses = async () => {
    try {
      setIsLoading(true);
      
      // 1. Load budgets for selected month
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('month_year', selectedMonth);
      
      if (budgetError) throw budgetError;
      
      // 2. Parse month/year to get date range for expenses
      const [monthName, year] = selectedMonth.split(' ');
      const monthIndex = new Date(Date.parse(`${monthName} 1, ${year}`)).getMonth();
      
      const startDate = new Date(parseInt(year), monthIndex, 1).toISOString();
      const endDate = new Date(parseInt(year), monthIndex + 1, 0).toISOString();
      
      // 3. Load expenses for the date range
      const { data: expenseData, error: expenseError } = await supabase
        .from('transactions')
        .select('category_id, amount')
        .eq('type', 'expense')
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      
      if (expenseError) throw expenseError;
      
      // 4. Sum up expenses by category using the standardized category mapping
      const expensesByCategory = {};
      (expenseData || []).forEach(expense => {
        // Map the category_id to budget category name using our mapping
        const cat = expense.category_id ? 
          CATEGORY_TO_BUDGET_MAP[expense.category_id] || 'Other' : 
          'Other';
          
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + parseFloat(expense.amount || 0);
      });
      
      // 5. Update state
      setBudgets(budgetData || []);
      setExpenses(expensesByCategory);
      
      // Play success sound for completed load
      new Audio('/sounds/successful-task.mp3').play().catch(e => {});
      
    } catch (error) {
      console.error('Error loading budgets:', error);
      toast.error('Failed to load budget data');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission for new/edited budget
  const handleSaveBudget = async (e) => {
    e?.preventDefault();
    
    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (!formData.duration || parseInt(formData.duration) <= 0) {
      toast.error('Please enter a valid duration in days');
      return;
    }
    
    try {
      const budgetItem = {
        category: formData.category, // This is now the standardized category name
        amount: parseFloat(formData.amount),
        month_year: selectedMonth,
        duration: parseInt(formData.duration)
      };
      
      if (editingBudget) {
        // Update existing budget
        const { error } = await supabase
          .from('budgets')
          .update(budgetItem)
          .eq('id', editingBudget.id);
        
        if (error) throw error;
        
        toast.success(`Budget for ${formData.category} updated!`);
      } else {
        // Create new budget
        const { error } = await supabase
          .from('budgets')
          .insert([budgetItem]);
        
        if (error) throw error;
        
        // Award points for creating a new budget
        addPoints(5, `Created budget for ${formData.category}`);
        toast.success(`Budget for ${formData.category} created! +5 points 🎯`);
      }
      
      // Play success sound
      new Audio('/sounds/success.mp3').play().catch(e => {});
      
      // Reset form and reload budgets
      setFormData({ category: '', amount: '', description: '', duration: 30 });
      setShowAddForm(false);
      setEditingBudget(null);
      loadBudgetsAndExpenses();
      
    } catch (error) {
      console.error('Error saving budget:', error);
      toast.error('Failed to save budget');
    }
  };

  // Edit budget
  const handleEditBudget = (budget) => {
    setFormData({
      category: budget.category,
      amount: budget.amount.toString(),
      description: budget.description || '',
      duration: budget.duration || 30 // Use existing duration or default to 30
    });
    setEditingBudget(budget);
    setShowAddForm(true);
    
    // Scroll to form
    document.querySelector('.budget-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Delete budget
  const handleDeleteBudget = async (budget) => {
    if (!window.confirm(`Are you sure you want to delete the budget for ${budget.category}?`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budget.id);
      
      if (error) throw error;
      
      toast.success(`Budget for ${budget.category} deleted`);
      loadBudgetsAndExpenses();
      
      // Play delete sound
      new Audio('/sounds/delete.mp3').play().catch(e => {});
      
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast.error('Failed to delete budget');
    }
  };

  // Calculate progress percentage for a budget
  const getBudgetProgress = (budgetCategory, budgetAmount) => {
    const spent = expenses[budgetCategory] || 0;
    const percentage = (spent / budgetAmount) * 100;
    return Math.min(percentage, 100); // Cap at 100%
  };

  // Get appropriate color for progress bar based on percentage
  const getProgressColor = (percentage) => {
    if (percentage >= 90) return 'danger';
    if (percentage >= 75) return 'warning';
    return 'safe';
  };
  
  // Toggle budget details expansion
  const toggleBudgetDetails = (budgetId) => {
    if (expandedBudget === budgetId) {
      setExpandedBudget(null);
    } else {
      setExpandedBudget(budgetId);
    }
  };
  
  // Get motivational message based on budget status
  const getMotivationalMessage = (budget) => {
    const spent = expenses[budget.category] || 0;
    const percentage = (spent / budget.amount) * 100;
    const remaining = budget.amount - spent;
    
    if (percentage >= 100) {
      return `You've exceeded your ${budget.category} budget. Time to adjust for next month!`;
    } else if (percentage >= 90) {
      return `Almost at your limit! Only ${formatAmount(remaining)} left in your ${budget.category} budget.`;
    } else if (percentage >= 75) {
      return `Getting close to your limit. You have ${formatAmount(remaining)} remaining for ${budget.category}.`;
    } else if (percentage >= 50) {
      return `You're doing well! Still have ${formatAmount(remaining)} left to spend on ${budget.category}.`;
    } else {
      return `Excellent budgeting! You've used only ${Math.round(percentage)}% of your ${budget.category} budget.`;
    }
  };

  // Calculate days remaining for a budget
  const getDaysRemaining = (budget) => {
    const creationDate = new Date(budget.created_at);
    const duration = budget.duration || 30; // Default to 30 if not specified
    const endDate = new Date(creationDate);
    endDate.setDate(endDate.getDate() + duration);
    
    const today = new Date();
    const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    
    return Math.max(0, daysRemaining); // Don't return negative days
  };
  
  // Get budget status based on time remaining and spending
  const getBudgetStatus = (budget) => {
    const daysRemaining = getDaysRemaining(budget);
    const spent = expenses[budget.category] || 0;
    const percentSpent = (spent / budget.amount) * 100;
    
    if (daysRemaining === 0) return 'expired';
    if (percentSpent >= 100) return 'overspent';
    if (percentSpent >= 80 && daysRemaining <= budget.duration * 0.2) return 'critical';
    if (percentSpent >= 70 && daysRemaining <= budget.duration * 0.3) return 'warning';
    return 'good';
  };

  // Update this helper function to use our standardized categories
  const getCategoryEmoji = (categoryName) => {
    // Find the category by name in our EXPENSE_CATEGORIES
    const category = EXPENSE_CATEGORIES.find(cat => cat.name === categoryName);
    return category ? category.icon : '🎯';
  };
  
  const getCategoryColor = (categoryName) => {
    // Find the category by name in our EXPENSE_CATEGORIES
    const category = EXPENSE_CATEGORIES.find(cat => cat.name === categoryName);
    return category ? category.color : '#6366f1';
  };

  return (
    <div className={`budget-management ${darkMode ? 'dark' : 'light'}-mode`}>
      {/* Header Section */}
      <motion.section 
        className="budget-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="header-content">
          
          <h1>Budget Management</h1>
          <p className="budget-subtitle">Create and track your spending limits</p>
        </div>
      </motion.section>

      {/* Month Selector & Quick Summary - Fixed for mobile */}
      <motion.section 
        className="month-selector-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="month-selector">
          <div className="month-label">Showing budgets for:</div>
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="month-select"
          >
            {generateMonthOptions().map(month => (
              <option key={month} value={month}>
                {month} {month === currentMonthYear ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>
        
        <div className="budget-quick-summary">
          <div className="summary-item">
            <div className="summary-label">Total Budgeted:</div>
            <div className="summary-amount">
              {formatAmount(budgets.reduce((sum, budget) => sum + parseFloat(budget.amount || 0), 0))}
            </div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Total Spent:</div>
            <div className="summary-amount">
              {formatAmount(Object.values(expenses).reduce((sum, amount) => sum + amount, 0))}
            </div>
          </div>
        </div>
      </motion.section>

      <br />

      <div className="budget-content">
        {/* Budget Progress & Add Button - Improved for mobile */}
        <motion.section 
          className="budget-progress-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="section-header">
            <h2>Budget Progress</h2>
            
          </div>
          
          {isLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading your budgets...</p>
            </div>
          ) : budgets.length === 0 ? (
            <motion.div 
              className="empty-budgets"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="empty-icon">📊</div>
              <h3>No Budgets Set for {selectedMonth}</h3>
              <p>Create your first budget to start tracking your spending!</p>
              <button 
                className="create-first-budget-btn"
                onClick={() => setShowAddForm(true)}
              >
                Create Your First Budget
              </button>
            </motion.div>
          ) : (
            <div className="budget-cards-container">
              {budgets.map(budget => {
                const progress = getBudgetProgress(budget.category, budget.amount);
                const spent = expenses[budget.category] || 0;
                const remaining = budget.amount - spent;
                const progressStatus = getProgressColor(progress);
                const isExpanded = expandedBudget === budget.id;
                const daysRemaining = getDaysRemaining(budget);
                const budgetStatus = getBudgetStatus(budget);
                const categoryColor = getCategoryColor(budget.category);
                
                return (
                  <motion.div 
                    key={budget.id} 
                    className={`budget-card ${progressStatus} ${budgetStatus}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ y: -5 }}
                    transition={{ duration: 0.3 }}
                    style={{ borderLeftColor: categoryColor }}
                  >
                    <div className="budget-card-header" onClick={() => toggleBudgetDetails(budget.id)}>
                      <div className="budget-category">
                        <span className="category-icon" style={{ backgroundColor: categoryColor }}>
                          {getCategoryEmoji(budget.category)}
                        </span>
                        <h3>{budget.category}</h3>
                      </div>
                      <div className="budget-actions">
                        <button 
                          className="budget-action-btn edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditBudget(budget);
                          }}
                          aria-label="Edit budget"
                        >
                          <span className="action-icon">✏️</span>
                        </button>
                        <button 
                          className="budget-action-btn delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBudget(budget);
                          }}
                          aria-label="Delete budget"
                        >
                          <span className="action-icon">🗑️</span>
                        </button>
                      </div>
                    </div>
                    
                    <div className="budget-amounts">
                      <div className="spent-amount">
                        <span className="amount-value">{formatAmount(spent)}</span>
                        <span className="amount-label">spent</span>
                      </div>
                      <div className="budget-divider">of</div>
                      <div className="budget-amount">
                        <span className="amount-value">{formatAmount(budget.amount)}</span>
                        <span className="amount-label">budget</span>
                      </div>
                    </div>
                    
                    <div className="budget-progress-container">
                      <div className="budget-progress-bar">
                        <div 
                          className={`progress-fill ${progressStatus}`}
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="budget-progress-stats">
                        <span className="progress-percentage">{Math.round(progress)}% used</span>
                        <span className="progress-remaining">
                          {remaining >= 0 ? 
                            `${formatAmount(remaining)} remaining` : 
                            `${formatAmount(Math.abs(remaining))} over budget`
                          }
                        </span>
                      </div>
                    </div>
                    
                    <div className="budget-timeframe">
                      <span className={`days-remaining ${daysRemaining < 5 ? 'urgent' : ''}`}>
                        {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                      </span>
                      <span className="total-duration">of {budget.duration || 30} days</span>
                    </div>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div 
                          className="budget-details"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          {budget.description && (
                            <div className="budget-description">
                              <div className="description-label">Description:</div>
                              <div className="description-content">{budget.description}</div>
                            </div>
                          )}
                          
                          <div className="budget-motivation">
                            <div className="motivation-icon">
                              {progress >= 90 ? '⚠️' : progress >= 75 ? '⚠️' : '✅'}
                            </div>
                            <div className="motivation-text">
                              {getMotivationalMessage(budget)}
                            </div>
                          </div>
                          
                          <div className="budget-duration-info">
                            <div className="duration-label">Budget Duration:</div>
                            <div className="duration-content">
                              {budget.duration || 30} days (ends {new Date(new Date(budget.created_at).getTime() + (budget.duration || 30) * 24 * 60 * 60 * 1000).toLocaleDateString()})
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* Budget Form - Mobile optimized */}
        <AnimatePresence>
          {showAddForm && (
            <motion.section 
              className="budget-form-container"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="budget-form">
                <h2>{editingBudget ? 'Update Budget' : 'Create New Budget'}</h2>
                
                <form onSubmit={handleSaveBudget}>
                  <div className="form-group category-selection-group">
                    <label htmlFor="category">Category</label>
                    
                    <div className="category-grid">
                      {categories.map(cat => (
                        <div
                          key={cat.name}
                          className={`category-item ${formData.category === cat.name ? 'selected' : ''}`}
                          onClick={() => setFormData({...formData, category: cat.name})}
                          style={{ 
                            borderColor: formData.category === cat.name ? cat.color : 'var(--color-border)',
                            backgroundColor: formData.category === cat.name ? `${cat.color}15` : 'var(--color-secondaryBg)' 
                          }}
                        >
                          <div className="category-icon" style={{ backgroundColor: cat.color }}>
                            {cat.icon}
                          </div>
                          <div className="category-name">{cat.name}</div>
                          {formData.category === cat.name && (
                            <div className="category-selected-indicator" style={{ backgroundColor: cat.color }}>
                              ✓
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="amount">Budget Amount</label>
                    <div className="amount-input-group">
                      <input
                        id="amount"
                        type="number"
                        inputMode="decimal"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        placeholder="0.00"
                        className="form-input"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="description">Description (Optional)</label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Add notes about this budget"
                      className="form-textarea"
                      rows="3"
                    ></textarea>
                  </div>
                  
                  {/* Add duration field */}
                  <div className="form-group">
                    <label htmlFor="duration">Budget Duration (Days)</label>
                    <div className="duration-input-group">
                      <input
                        id="duration"
                        type="number"
                        inputMode="numeric"
                        value={formData.duration}
                        onChange={(e) => setFormData({...formData, duration: e.target.value})}
                        placeholder="30"
                        className="form-input"
                        min="1"
                        max="365"
                        required
                      />
                      <div className="duration-info">
                        <span className="info-icon">ℹ️</span>
                        <span className="info-text">How many days this budget will last</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-actions">
                    <button 
                      type="button" 
                      className="cancel-btn"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingBudget(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="save-btn"
                    >
                      {editingBudget ? 'Update Budget' : 'Save Budget'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

      

        {/* Tips section - Simplified for mobile */}
        <motion.section 
          className="budget-tips"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2>Budget Tips & Insights</h2>
          
          <div className="tips-grid">
            <div className="tip-card">
              <div className="tip-icon">💡</div>
              <h3>50/30/20 Rule</h3>
              <p>Allocate 50% of your income to needs, 30% to wants, and 20% to savings and debt repayment.</p>
            </div>
            
            <div className="tip-card">
              <div className="tip-icon">📊</div>
              <h3>Track Expenses</h3>
              <p>Regularly monitor your expenses to stay within your budget limits.</p>
            </div>
            
            <div className="tip-card">
              <div className="tip-icon">🎯</div>
              <h3>Set Realistic Goals</h3>
              <p>Create achievable budget targets based on your past spending habits.</p>
            </div>
            
            <div className="tip-card">
              <div className="tip-icon">💰</div>
              <h3>Emergency Fund</h3>
              <p>Aim to save 3-6 months of expenses in an emergency fund.</p>
            </div>
          </div>
        </motion.section>
      </div>
      
      {/* Floating Action Button for Mobile */}
      <div className="mobile-fab">
        <button 
          className="mobile-add-btn"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingBudget(null);
            setFormData({ category: '', amount: '', description: '', duration: 30 });
            // Scroll to form if showing
            if (!showAddForm) {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        >
          {showAddForm ? '✕' : '+'}
        </button>
      </div>
    </div>
  );
};

export default BudgetManagement;
