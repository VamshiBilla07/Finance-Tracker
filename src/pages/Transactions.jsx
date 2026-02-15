import React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';
import '../styles/pages/Transactions.css';
import '../styles/global/global.css';
import { useNavigate } from 'react-router-dom';

const Transactions = () => {
  const { darkMode } = useTheme();
  const { formatAmount, formatDate } = useCurrency();
  const navigate = useNavigate();
  
  // State variables
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [summary, setSummary] = useState({
    income: 0,
    expenses: 0,
    balance: 0,
    incomeChange: 0,
    expensesChange: 0,
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    type: 'all',
    category: 'all',
    reason: 'all',
    startDate: '',
    endDate: '',
    search: '',
  });
  
  // Pagination states
  const [pagination, setPagination] = useState({
    currentPage: 1,
    entriesPerPage: 10,
    totalEntries: 0,
    totalPages: 1,
  });

  // Add this state to track all reasons
  const [allReasons, setAllReasons] = useState({
    income: [],
    expense: []
  });
  
  // Load transactions on component mount
  useEffect(() => {
    fetchTransactions();
  }, []);
  
  // Filter transactions whenever filters change
  useEffect(() => {
    if (transactions.length > 0) {
      applyFilters();
    }
  }, [filters, transactions, activeTab]);
  
  // Update reason filter when tab or category filter changes
  useEffect(() => {
    // Reset reason filter when changing transaction type tab
    setFilters(prev => ({...prev, reason: 'all'}));
  }, [activeTab]);

  // Make sure we load all reasons, including custom ones
  useEffect(() => {
    // Extract all unique reasons including custom ones
    const allReasons = {
      income: [],
      expense: []
    };
    
    transactions.forEach(t => {
      if (t.type === 'income' && t.reason && !allReasons.income.includes(t.reason)) {
        allReasons.income.push(t.reason);
      } else if (t.type === 'expense' && t.reason && !allReasons.expense.includes(t.reason)) {
        allReasons.expense.push(t.reason);
      }
    });
    
    // Update reasons state if we have new ones
    if (allReasons.income.length > 0 || allReasons.expense.length > 0) {
      setAllReasons(allReasons);
    }
  }, [transactions]);

  // Fetch transactions from the database
  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      
      // Fetch from Supabase
      const { data, error } = await supabase
        .from('transactions')
        .select('*, balance_type:balance_type_id (name, icon)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Process transactions
      const processedTransactions = data.map(transaction => ({
        ...transaction,
        formattedDate: new Date(transaction.created_at).toLocaleDateString(),
        accountName: transaction.balance_type?.name || 'Unknown Account',
        accountIcon: transaction.balance_type?.icon || '💰'
      }));
      
      setTransactions(processedTransactions);
      setFilteredTransactions(processedTransactions);
      calculateSummary(processedTransactions);
      
      // Update pagination
      setPagination(prev => ({
        ...prev,
        totalEntries: processedTransactions.length,
        totalPages: Math.ceil(processedTransactions.length / prev.entriesPerPage)
      }));
      
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate financial summary
  const calculateSummary = (transactionsData) => {
    const income = transactionsData
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      
    const expenses = transactionsData
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      
    // Calculate monthly changes (example logic - would need actual historical data)
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const thisMonthData = transactionsData.filter(t => {
      const date = new Date(t.created_at);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    const lastMonthData = transactionsData.filter(t => {
      const date = new Date(t.created_at);
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    });
    
    const thisMonthIncome = thisMonthData
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      
    const lastMonthIncome = lastMonthData
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      
    const thisMonthExpenses = thisMonthData
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      
    const lastMonthExpenses = lastMonthData
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    // Calculate percentage changes
    let incomeChange = 0;
    let expensesChange = 0;
    
    if (lastMonthIncome > 0) {
      incomeChange = ((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100;
    }
    
    if (lastMonthExpenses > 0) {
      expensesChange = ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100;
    }
    
    setSummary({
      income,
      expenses,
      balance: income - expenses,
      incomeChange: parseFloat(incomeChange.toFixed(1)),
      expensesChange: parseFloat(expensesChange.toFixed(1))
    });
  };
  
  // Apply filters to transactions
  const applyFilters = () => {
    let filtered = [...transactions];
    
    // Filter by active tab
    switch (activeTab) {
      case 'income':
        filtered = filtered.filter(t => t.type === 'income');
        break;
      case 'expense':
        filtered = filtered.filter(t => t.type === 'expense');
        break;
      // 'all' case doesn't need additional filtering
    }
    
    // Filter by type if not in the tab view
    if (filters.type !== 'all' && activeTab === 'all') {
      filtered = filtered.filter(t => t.type === filters.type);
    }
    
    // Filter by category
    if (filters.category !== 'all') {
      filtered = filtered.filter(t => t.category === filters.category);
    }
    
    // Modify the filter by reason logic to make it more robust
    if (filters.reason && filters.reason !== 'all') {
      filtered = filtered.filter(t => t.reason === filters.reason);
    }
    
    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter(t => new Date(t.created_at) >= new Date(filters.startDate));
    }
    
    if (filters.endDate) {
      filtered = filtered.filter(t => new Date(t.created_at) <= new Date(filters.endDate + 'T23:59:59'));
    }
    
    // Filter by search term
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.note?.toLowerCase().includes(searchLower) || 
        t.category?.toLowerCase().includes(searchLower) ||
        t.reason?.toLowerCase().includes(searchLower) ||
        t.accountName?.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredTransactions(filtered);
    
    // Update pagination
    setPagination(prev => ({
      ...prev,
      totalEntries: filtered.length,
      totalPages: Math.ceil(filtered.length / prev.entriesPerPage),
      currentPage: 1 // Reset to first page on filter change
    }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      type: 'all',
      category: 'all',
      reason: 'all',
      startDate: '',
      endDate: '',
      search: '',
    });
  };
  
  // Handle filter changes
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Get paginated transactions
  const getPaginatedTransactions = () => {
    const startIndex = (pagination.currentPage - 1) * pagination.entriesPerPage;
    return filteredTransactions.slice(startIndex, startIndex + pagination.entriesPerPage);
  };
  
  // Navigate to Add Income/Expense pages
  const navigateToAddTransaction = (type) => {
    if (type === 'income') {
      navigate('/add-income');
    } else {
      navigate('/add-expense');
    }
  };
  
  // Get unique categories from transactions
  const getCategories = () => {
    const categories = {
      income: [],
      expense: []
    };
    
    transactions.forEach(t => {
      if (t.type === 'income' && !categories.income.includes(t.category)) {
        categories.income.push(t.category);
      } else if (t.type === 'expense' && !categories.expense.includes(t.category)) {
        categories.expense.push(t.category);
      }
    });
    
    return categories;
  };
  
  // Get unique reasons from transactions based on current type filter
  const getReasons = () => {
    const reasonsFromTransactions = {
      income: [],
      expense: []
    };
    
    transactions.forEach(t => {
      if (t.type === 'income' && t.reason && !reasonsFromTransactions.income.includes(t.reason)) {
        reasonsFromTransactions.income.push(t.reason);
      } else if (t.type === 'expense' && t.reason && !reasonsFromTransactions.expense.includes(t.reason)) {
        reasonsFromTransactions.expense.push(t.reason);
      }
    });
    
    // Sort reasons alphabetically for better UX
    reasonsFromTransactions.income.sort();
    reasonsFromTransactions.expense.sort();
    
    return reasonsFromTransactions;
  };
  
  const categories = getCategories();
  const reasons = getReasons();

  // Get filtered reasons based on active tab or selected category
  const getFilteredReasons = () => {
    if (activeTab === 'income') {
      return reasons.income;
    } else if (activeTab === 'expense') {
      return reasons.expense;
    } else if (filters.category !== 'all') {
      // Check if the selected category belongs to income or expense
      const categoryType = categories.income.includes(filters.category) ? 'income' : 'expense';
      return categoryType === 'income' ? reasons.income : reasons.expense;
    } else {
      // When in 'all' tab and no category filter
      return [...reasons.income, ...reasons.expense];
    }
  };

  const filteredReasons = getFilteredReasons();

  // Get category icon based on name
  const getCategoryIcon = (type, category) => {
    if (type === 'income') {
      switch (category) {
        case 'Salary': return '💼';
        case 'Freelance': return '💻';
        case 'Gift': return '🎁';
        case 'Cashback': return '💝';
        case 'Investment Return': return '📈';
        default: return '💰';
      }
    } else {
      switch (category) {
        case 'Food': return '🍔';
        case 'Transport': return '🚗';
        case 'Shopping': return '🛍️';
        case 'Entertainment': return '🎬';
        case 'Bills': return '📄';
        case 'Investment': return '📊';
        default: return '💸';
      }
    }
  };

  // Handle tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className={`transactions-page ${darkMode ? 'dark' : 'light'}-mode`}>
      <div className="transactions-container">
        {/* Header Section */}
        <motion.div 
          className="transactions-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1>Transactions</h1>
          <p>View and manage your financial activities</p>
        </motion.div>
        
        <div className="transactions-content">
          {/* Financial Summary */}
          <motion.div 
            className="transaction-summary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="summary-card income">
              <div className="summary-icon income">💰</div>
              <div className="summary-details">
                <span className="summary-label">Total Income</span>
                <span className="summary-value">{formatAmount(summary.income)}</span>
                <span className={`summary-trend ${summary.incomeChange >= 0 ? 'trend-up' : 'trend-down'}`}>
                  {summary.incomeChange >= 0 ? '↑' : '↓'} {Math.abs(summary.incomeChange)}% from last month
                </span>
              </div>
            </div>
            
            <div className="summary-card expenses">
              <div className="summary-icon expenses">💸</div>
              <div className="summary-details">
                <span className="summary-label">Total Expenses</span>
                <span className="summary-value">{formatAmount(summary.expenses)}</span>
                <span className={`summary-trend ${summary.expensesChange <= 0 ? 'trend-up' : 'trend-down'}`}>
                  {summary.expensesChange <= 0 ? '↓' : '↑'} {Math.abs(summary.expensesChange)}% from last month
                </span>
              </div>
            </div>
            
            <div className="summary-card balance">
              <div className="summary-icon balance">⚖️</div>
              <div className="summary-details">
                <span className="summary-label">Net Balance</span>
                <span className="summary-value">{formatAmount(summary.balance)}</span>
                <span className="summary-trend">
                  {summary.balance >= 0 ? 'Positive balance! 🎉' : 'Negative balance! ⚠️'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Main Content Area with Sidebar and Transaction List */}
          <div className="transactions-layout">
            {/* Sidebar with Filters */}
            <motion.div 
              className="transactions-sidebar"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="sidebar-section">
                <div className="sidebar-header">
                  <h3>Transaction Type</h3>
                </div>
                <div className="sidebar-content">
                  <div className="tab-navigation">
                    <button 
                      className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
                      onClick={() => handleTabChange('all')}
                    >
                      All
                    </button>
                    <button 
                      className={`tab-button ${activeTab === 'income' ? 'active' : ''}`}
                      onClick={() => handleTabChange('income')}
                    >
                      Income
                    </button>
                    <button 
                      className={`tab-button ${activeTab === 'expense' ? 'active' : ''}`}
                      onClick={() => handleTabChange('expense')}
                    >
                      Expense
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="sidebar-section">
                <div className="sidebar-header">
                  <h3>Filter Transactions</h3>
                </div>
                <div className="sidebar-content">
                  <div className="filter-group">
                    <label>Category</label>
                    <select 
                      className="filter-select"
                      value={filters.category}
                      onChange={(e) => {
                        // Reset reason when category changes
                        handleFilterChange('category', e.target.value);
                        handleFilterChange('reason', 'all');
                      }}
                    >
                      <option value="all">All Categories</option>
                      {activeTab === 'income' || activeTab === 'all' ? (
                        <optgroup label="Income">
                          {categories.income.map(cat => (
                            <option key={`income-${cat}`} value={cat}>{cat}</option>
                          ))}
                        </optgroup>
                      ) : null}
                      
                      {activeTab === 'expense' || activeTab === 'all' ? (
                        <optgroup label="Expenses">
                          {categories.expense.map(cat => (
                            <option key={`expense-${cat}`} value={cat}>{cat}</option>
                          ))}
                        </optgroup>
                      ) : null}
                    </select>
                  </div>
                  
                  <div className="filter-group">
                    <label>Reason <span style={{ color: 'red' }}>*</span></label>
                    <select 
                      className="filter-select"
                      value={filters.reason}
                      onChange={(e) => handleFilterChange('reason', e.target.value)}
                      style={filters.reason === 'all' ? { borderColor: 'red' } : {}}
                    >
                      <option value="all">Select a Reason (Required)</option>
                      {activeTab === 'income' ? (
                        <optgroup label="Income Reasons">
                          {reasons.income.length > 0 ? 
                            reasons.income.map(reason => (
                              <option key={`reason-${reason}`} value={reason}>{reason}</option>
                            )) : 
                            <option value="" disabled>No income reasons found</option>
                          }
                        </optgroup>
                      ) : activeTab === 'expense' ? (
                        <optgroup label="Expense Reasons">
                          {reasons.expense.length > 0 ? 
                            reasons.expense.map(reason => (
                              <option key={`reason-${reason}`} value={reason}>{reason}</option>
                            )) : 
                            <option value="" disabled>No expense reasons found</option>
                          }
                        </optgroup>
                      ) : filters.category !== 'all' && categories.income.includes(filters.category) ? (
                        <optgroup label="Income Reasons">
                          {reasons.income.length > 0 ? 
                            reasons.income.map(reason => (
                              <option key={`reason-${reason}`} value={reason}>{reason}</option>
                            )) : 
                            <option value="" disabled>No income reasons found</option>
                          }
                        </optgroup>
                      ) : filters.category !== 'all' && categories.expense.includes(filters.category) ? (
                        <optgroup label="Expense Reasons">
                          {reasons.expense.length > 0 ? 
                            reasons.expense.map(reason => (
                              <option key={`reason-${reason}`} value={reason}>{reason}</option>
                            )) : 
                            <option value="" disabled>No expense reasons found</option>
                          }
                        </optgroup>
                      ) : (
                        <>
                          <optgroup label="Income Reasons">
                            {reasons.income.length > 0 ? 
                              reasons.income.map(reason => (
                                <option key={`income-${reason}`} value={reason}>{reason}</option>
                              )) : 
                              <option value="" disabled>No income reasons found</option>
                            }
                          </optgroup>
                          <optgroup label="Expense Reasons">
                            {reasons.expense.length > 0 ? 
                              reasons.expense.map(reason => (
                                <option key={`expense-${reason}`} value={reason}>{reason}</option>
                              )) : 
                              <option value="" disabled>No expense reasons found</option>
                            }
                          </optgroup>
                        </>
                      )}
                    </select>
                    {filters.reason === 'all' && (
                      <div style={{ color: 'red', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                        Please select a reason
                      </div>
                    )}
                  </div>
                  
                  <div className="filter-group">
                    <label>Date Range</label>
                    <div className="date-range-container">
                      <div className="date-input-group">
                        <label>From</label>
                        <input 
                          type="date" 
                          className="filter-input" 
                          value={filters.startDate}
                          onChange={(e) => handleFilterChange('startDate', e.target.value)}
                        />
                      </div>
                      <div className="date-input-group">
                        <label>To</label>
                        <input 
                          type="date" 
                          className="filter-input" 
                          value={filters.endDate}
                          onChange={(e) => handleFilterChange('endDate', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="filter-group">
                    <label>Search</label>
                    <div className="search-container">
                      <input 
                        type="text" 
                        className="search-input" 
                        placeholder="Search notes, categories..." 
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                      />
                      <span className="search-icon">🔍</span>
                    </div>
                  </div>
                  
                  <div className="filter-actions">
                    <button 
                      className="filter-button reset-filters"
                      onClick={resetFilters}
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Transaction List Main Content */}
            <motion.div
              className="transactions-main"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="transactions-panel">
                <div className="panel-header">
                  <h2>
                    {activeTab === 'income' ? 'Income History' : 
                     activeTab === 'expense' ? 'Expense History' : 
                     'Transaction History'}
                  </h2>
                  <div className="panel-actions">
                    <select
                      className="entries-select"
                      value={pagination.entriesPerPage}
                      onChange={(e) => setPagination({
                        ...pagination,
                        entriesPerPage: parseInt(e.target.value),
                        totalPages: Math.ceil(filteredTransactions.length / parseInt(e.target.value)),
                        currentPage: 1
                      })}
                    >
                      <option value="10">10 entries</option>
                      <option value="25">25 entries</option>
                      <option value="50">50 entries</option>
                      <option value="100">100 entries</option>
                    </select>
                  </div>
                </div>
                
                {isLoading ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p className="loading-text">Loading transactions...</p>
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📊</div>
                    <h3 className="empty-title">No transactions found</h3>
                    <p className="empty-description">
                      {filters.category !== 'all' || filters.reason !== 'all' || filters.search || filters.startDate || filters.endDate
                        ? "Try adjusting your filters to see more results."
                        : "Start by adding income or expenses from their respective pages."}
                    </p>
                    {(filters.category === 'all' && filters.reason === 'all' && !filters.search && !filters.startDate && !filters.endDate) && (
                      <div className="empty-actions">
                        <button onClick={() => navigateToAddTransaction('income')} className="income-action">
                          Add Income
                        </button>
                        <button onClick={() => navigateToAddTransaction('expense')} className="expense-action">
                          Add Expense
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="transactions-list">
                      {getPaginatedTransactions().map(transaction => (
                        <div 
                          className={`transaction-item ${transaction.type}`} 
                          key={transaction.id}
                        >
                          <div className="transaction-icon">
                            {getCategoryIcon(transaction.type, transaction.category)}
                          </div>
                          
                          <div className="transaction-details">
                            <div className="transaction-primary">
                              <h4 className="transaction-category">{transaction.category}</h4>
                              <span className={`transaction-amount amount-${transaction.type}`}>
                                {transaction.type === 'income' ? '+' : '-'} {formatAmount(transaction.amount)}
                              </span>
                            </div>
                            
                            <div className="transaction-secondary">
                              <div className="transaction-meta">
                                <span className="transaction-account">
                                  {transaction.accountIcon} {transaction.accountName}
                                </span>
                                <span className="transaction-reason">
                                  {transaction.reason && `Reason: ${transaction.reason}`}
                                </span>
                                <span className="transaction-date">{transaction.formattedDate}</span>
                              </div>
                              
                              {transaction.note && (
                                <p className="transaction-note">
                                  {transaction.note}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Pagination controls */}
                    <div className="pagination-container">
                      <div className="pagination-info">
                        Showing {Math.min(pagination.totalEntries, 1 + (pagination.currentPage - 1) * pagination.entriesPerPage)}-
                        {Math.min(pagination.currentPage * pagination.entriesPerPage, pagination.totalEntries)} of {pagination.totalEntries} entries
                      </div>
                      
                      <div className="pagination-controls">
                        <button 
                          className="pagination-button" 
                          disabled={pagination.currentPage === 1}
                          onClick={() => setPagination({...pagination, currentPage: 1})}
                        >
                          ⟪ First
                        </button>
                        <button 
                          className="pagination-button" 
                          disabled={pagination.currentPage === 1}
                          onClick={() => setPagination({...pagination, currentPage: pagination.currentPage - 1})}
                        >
                          ⟨ Prev
                        </button>
                        
                        <div className="pagination-pages">
                          {/* Page numbers */}
                          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                            let pageNum;
                            if (pagination.totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (pagination.currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (pagination.currentPage >= pagination.totalPages - 2) {
                              pageNum = pagination.totalPages - 4 + i;
                            } else {
                              pageNum = pagination.currentPage - 2 + i;
                            }
                            
                            return (
                              <button 
                                key={pageNum}
                                className={`pagination-page ${pagination.currentPage === pageNum ? 'active' : ''}`}
                                onClick={() => setPagination({...pagination, currentPage: pageNum})}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        
                        <button 
                          className="pagination-button" 
                          disabled={pagination.currentPage === pagination.totalPages}
                          onClick={() => setPagination({...pagination, currentPage: pagination.currentPage + 1})}
                        >
                          Next ⟩
                        </button>
                        <button 
                          className="pagination-button" 
                          disabled={pagination.currentPage === pagination.totalPages}
                          onClick={() => setPagination({...pagination, currentPage: pagination.totalPages})}
                        >
                          Last ⟫
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Mobile Action Buttons - Only show when there are no transactions and no filters applied */}
        {filteredTransactions.length === 0 && 
         filters.category === 'all' && 
         filters.reason === 'all' && 
         !filters.search && 
         !filters.startDate && 
         !filters.endDate && (
          <div className="mobile-actions">
            <button 
              className="mobile-action income-action"
              onClick={() => navigateToAddTransaction('income')}
            >
              + Add Income
            </button>
            <button 
              className="mobile-action expense-action"
              onClick={() => navigateToAddTransaction('expense')}
            >
              + Add Expense
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
