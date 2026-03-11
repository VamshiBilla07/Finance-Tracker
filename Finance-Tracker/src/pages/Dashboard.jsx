import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, XAxis, YAxis } from 'recharts';
import { usePointsSystem } from '../hooks/usePointsSystem';
import { supabase } from '../services/supabaseClient';
import { getAllBalances } from '../services/balanceService';
import { runSystemDiagnostic } from '../services/diagnosticService';
import toast from 'react-hot-toast';
import '../styles/pages/Dashboard.css';
import React from 'react';
import '../styles/global/global.css';

const Dashboard = () => {
  const { darkMode } = useTheme();
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();
  const { points, level } = usePointsSystem();
  
  const [userData, setUserData] = useState(null);
  const [timeframe, setTimeframe] = useState('daily');
  const [analyticsData, setAnalyticsData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [savingsGoal, setSavingsGoal] = useState(5000);
  const [savingsProgress, setSavingsProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [balances, setBalances] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      // Improved balance loading
      try {
        // Get real balances from database with proper logging
        console.log('Fetching balances...');
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
          
          // Fallback to direct table check
          const { data: directData, error: directError } = await supabase
            .from('user_balances')
            .select('*');
            
          console.log('Direct balance data:', directData, directError);
        } else {
          console.log('Successfully loaded balances:', balancesData);
          
          // Transform data for frontend display
          const formattedBalances = balancesData.map(item => ({
            id: item.id,
            name: item.balance_type?.name || 'Account',
            icon: item.balance_type?.icon || '💰',
            balance: parseFloat(item.amount || 0),
            color: getColorForAccount(item.balance_type?.name)
          }));
          
          if (formattedBalances.length === 0) {
            // Fallback for development: Show sample data if no balances
            console.log('No balances found, using fixed sample data');
            setBalances([
              { 
                id: 'gpay-sample', 
                name: 'Gpay', 
                icon: '📱', 
                balance: 10626.08,
                color: '#4285F4'
              }
            ]);
            setTotalBalance(10626.08);
          } else {
            // Use real data
            setBalances(formattedBalances);
            const totalBal = formattedBalances.reduce(
              (sum, account) => sum + account.balance, 0
            );
            setTotalBalance(totalBal);
          }
        }
      } catch (balanceError) {
        console.error('Error processing balances:', balanceError);
        // Show hardcoded balance as fallback
        setBalances([
          { 
            id: 'gpay-fallback', 
            name: 'Gpay', 
            icon: '📱', 
            balance: 10626.08,
            color: '#4285F4' 
          }
        ]);
        setTotalBalance(10626.08);
      }
      
      // 2. Load transactions - simplified with error handling
      try {
        const { data: transactionsData, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (txError) throw txError;
        
        setTransactions(transactionsData || []);
        processTransactionsForTimeframe(transactionsData || [], timeframe);
        
        // 3. Calculate financial metrics
        const incomeTotal = (transactionsData || [])
          .filter(tx => tx.type === 'income')
          .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
        
        const expenseTotal = (transactionsData || [])
          .filter(tx => tx.type === 'expense')
          .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
        
        const savingsTotal = incomeTotal - expenseTotal;
        
        setUserData({
          income: incomeTotal,
          expenses: expenseTotal,
          savings: savingsTotal
        });
      } catch (txError) {
        console.error("Error loading transactions:", txError);
        // Continue with empty transactions
        setTransactions([]);
        setUserData({
          income: 0,
          expenses: 0,
          savings: 0
        });
      }
      
    } catch (error) {
      console.error('Dashboard data loading error:', error);
      toast.error("Couldn't load all dashboard data");
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    // Initial data load with diagnostic on failure
    const initialLoad = async () => {
      try {
        await loadAllData();
      } catch (error) {
        console.error("Initial dashboard load failed:", error);
        
        toast.error("Having trouble loading your data. Running diagnostics...");
        
        // Run diagnostics
        const diagnosticResults = await runSystemDiagnostic();
        
        // If there are specific issues, try to handle them
        if (!diagnosticResults.balances.exists || diagnosticResults.balances.rowCount === 0) {
          toast.error("No balances found in the database. Please add some balances first.");
          
          // Optionally redirect to set up balances
          // navigate('/balances');
        } else if (!diagnosticResults.connection.connected) {
          toast.error("Database connection issue. Please check your internet connection.");
        }
      }
    };
    
    initialLoad();
    
    // Set up refresh interval
    const interval = setInterval(() => loadAllData(), 60000); // Refresh every minute
    
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    if (transactions.length > 0) {
      processTransactionsForTimeframe(transactions, timeframe);
    }
  }, [timeframe, transactions]);
  
  const processTransactionsForTimeframe = (transactions, timeframe) => {
    if (!transactions || !transactions.length) {
      setAnalyticsData([]);
      return;
    }
    
    const now = new Date();
    let filteredTransactions = [];
    let aggregatedData = {};
    
    switch(timeframe) {
      case 'daily':
        filteredTransactions = transactions.filter(tx => {
          const txDate = new Date(tx.created_at || tx.date);
          const diffTime = now - txDate;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 7;
        });
        
        aggregatedData = filteredTransactions.reduce((acc, tx) => {
          const txDate = new Date(tx.created_at || tx.date);
          const day = txDate.toLocaleDateString('en-US', { weekday: 'short' });
          
          if (!acc[day]) {
            acc[day] = { day, income: 0, expenses: 0 };
          }
          
          if (tx.type === 'income') {
            acc[day].income += parseFloat(tx.amount || 0);
          } else {
            acc[day].expenses += parseFloat(tx.amount || 0);
          }
          
          return acc;
        }, {});
        
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const day = dayNames[date.getDay()];
          
          if (!aggregatedData[day]) {
            aggregatedData[day] = { day, income: 0, expenses: 0 };
          }
        }
        break;
        
      case 'weekly':
      case 'monthly':
      case '3month':
      case '6month':
      case '9month':
      case '1year':
        filteredTransactions = transactions;
        
        if (timeframe === 'monthly') {
          const lastSixMonths = [];
          for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            lastSixMonths.push(d.toLocaleDateString('en-US', { month: 'short' }));
          }
          
          lastSixMonths.forEach(month => {
            aggregatedData[month] = { day: month, income: 0, expenses: 0 };
          });
          
          filteredTransactions.forEach(tx => {
            const txDate = new Date(tx.created_at || tx.date);
            const month = txDate.toLocaleDateString('en-US', { month: 'short' });
            
            if (aggregatedData[month]) {
              if (tx.type === 'income') {
                aggregatedData[month].income += parseFloat(tx.amount || 0);
              } else {
                aggregatedData[month].expenses += parseFloat(tx.amount || 0);
              }
            }
          });
        }
        break;
      
      default:
    }
    
    let chartData = Object.values(aggregatedData);
    
    if (timeframe === 'daily') {
      const dayOrder = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
      chartData.sort((a, b) => dayOrder[a.day] - dayOrder[b.day]);
    }
    
    setAnalyticsData(chartData);
  };
  
  const handleQuickAction = (action) => {
    switch(action) {
      case 'income':
        navigate('/income/add');
        break;
      case 'expense':
        navigate('/expense/add');
        break;
      case 'transfer':
        navigate('/balances');
        break;
      case 'budget':
        navigate('/budgets');
        break;
      default:
        break;
    }
  };
  
  const getColorForAccount = (name) => {
    if (!name) return '#6366f1';
    
    // Specific colors for known accounts
    if (name.toLowerCase().includes('gpay')) return '#4285F4';
    if (name.toLowerCase().includes('cash')) return '#10b981';
    if (name.toLowerCase().includes('bank')) return '#f59e0b';
    if (name.toLowerCase().includes('credit')) return '#ef4444';
    
    // Default color palette for other accounts
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };
  
  const COLORS = darkMode 
    ? ['#8b5cf6', '#6366f1', '#3b82f6', '#14b8a6', '#f59e0b'] 
    : ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];
  
  return (
    <div className={`dashboard-container ${darkMode ? 'dark' : 'light'}-mode`}>
      {/* Centered Dashboard Header */}
      <section className="dashboard-header">
        <motion.div
          className="greeting"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1>Welcome, Vamshi BIlla!</h1>
          <p className="greeting-subtitle">Here's your financial overview</p>
        </motion.div>
      </section>
      
      {/* Main Dashboard Content */}
      <div className="dashboard-content">
        {/* Top Components Row */}
        <div className="dashboard-grid">
          {/* Total Balance Card */}
          <motion.div 
            className="dashboard-card balance-summary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="card-header">
              <h2>Total Balance</h2>
            </div>
            <div className="balance-amount">{formatAmount(totalBalance)}</div>
            <div className="balance-change">
              <span className="change-icon">▲</span>
              <span>{formatAmount(userData?.savings || 0)} Saved</span>
            </div>
          </motion.div>
          
          {/* Income Summary Card */}
          <motion.div 
            className="dashboard-card income-summary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="card-header">
              <h2>Income</h2>
            </div>
            <div className="income-amount">{formatAmount(userData?.income || 0)}</div>
            <div className="income-period">This month</div>
          </motion.div>
          
          {/* Expense Summary Card */}
          <motion.div 
            className="dashboard-card expense-summary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="card-header">
              <h2>Expenses</h2>
            </div>
            <div className="expense-amount">{formatAmount(userData?.expenses || 0)}</div>
            <div className="expense-period">This month</div>
          </motion.div>
          
          {/* Quick Actions Card */}
          <motion.div 
            className="dashboard-card quick-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="card-header">
              <h2>Quick Actions</h2>
            </div>
            <div className="quick-actions-grid">
              <button 
                className="action-btn" 
                onClick={() => handleQuickAction('income')}
                aria-label="Add income"
              >
                <span className="action-btn-icon">💰</span>
                <span className="action-btn-label">Income</span>
              </button>
              
              <button 
                className="action-btn" 
                onClick={() => handleQuickAction('expense')}
                aria-label="Add expense"
              >
                <span className="action-btn-icon">💸</span>
                <span className="action-btn-label">Expense</span>
              </button>
              
              <button 
                className="action-btn" 
                onClick={() => handleQuickAction('transfer')}
                aria-label="Transfer money"
              >
                <span className="action-btn-icon">🔄</span>
                <span className="action-btn-label">Transfer</span>
              </button>
              
              <button 
                className="action-btn" 
                onClick={() => handleQuickAction('budget')}
                aria-label="View budget"
              >
                <span className="action-btn-icon">📊</span>
                <span className="action-btn-label">Budget</span>
              </button>
            </div>
          </motion.div>
        </div>
        
        {/* Accounts Section */}
        <motion.section 
          className="accounts-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="section-header">
            <h2>Your Accounts</h2>
            <button 
              className="view-all-btn"
              onClick={() => navigate('/balances')}
            >
              View All
            </button>
          </div>
          
          <div className="accounts-container">
            {isLoading ? (
              <div className="loading-indicator">Loading accounts...</div>
            ) : balances.length === 0 ? (
              <div className="no-accounts-message">
                <p>No accounts found</p>
                <button 
                  className="add-account-btn"
                  onClick={() => navigate('/balances')}
                >
                  Add Account
                </button>
              </div>
            ) : (
              <div className="accounts-grid">
                {balances.map(account => (
                  <div key={account.id} className="account-card">
                    <div 
                      className="account-card-icon"
                      style={{ backgroundColor: `${account.color}20`, color: account.color }}
                    >
                      {account.icon || '💰'}
                    </div>
                    <div className="account-card-details">
                      <div className="account-card-name">{account.name}</div>
                      <div className="account-card-balance">{formatAmount(account.balance)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.section>
        
        {/* Recent Transactions Section */}
        <motion.section 
          className="transactions-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="section-header">
            <h2>Recent Transactions</h2>
            <button 
              className="view-all-btn"
              onClick={() => navigate('/transactions')}
            >
              View All
            </button>
          </div>
          
          <div className="transactions-container">
            {isLoading ? (
              <div className="loading-indicator">Loading transactions...</div>
            ) : transactions.length === 0 ? (
              <div className="no-transactions-message">
                <p>No recent transactions</p>
                <div className="add-transaction-buttons">
                  <button 
                    className="add-transaction-btn income"
                    onClick={() => navigate('/income/add')}
                  >
                    Add Income
                  </button>
                  <button 
                    className="add-transaction-btn expense"
                    onClick={() => navigate('/expense/add')}
                  >
                    Add Expense
                  </button>
                </div>
              </div>
            ) : (
              <div className="transactions-list">
                {transactions.slice(0, 5).map(transaction => (
                  <div 
                    key={transaction.id} 
                    className={`transaction-item ${transaction.type}`}
                    onClick={() => navigate('/transactions')}
                  >
                    <div className="transaction-icon">
                      {transaction.type === 'income' ? '💰' : '💸'}
                    </div>
                    <div className="transaction-details">
                      <div className="transaction-title">{transaction.category}</div>
                      <div className="transaction-date">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="transaction-amount">
                      <span className={`amount-value ${transaction.type}`}>
                        {transaction.type === 'income' ? '+' : '-'} {formatAmount(transaction.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.section>
        
        {/* Statistics/Charts Section */}
        <motion.section 
          className="charts-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="section-header">
            <h2>Financial Overview</h2>
          </div>
          
          <div className="charts-grid">
            {/* Spending by Category Chart */}
            <div className="chart-card">
              <h3>Spending by Category</h3>
              <div className="chart-container">
                {userData && userData.categories && Object.keys(userData.categories).length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={Object.entries(userData.categories).map(([name, value]) => ({
                          name,
                          value
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(userData.categories).map(([name, value], index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatAmount(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="no-data-message">
                    <p>No spending data available</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Income vs. Expenses Chart */}
            <div className="chart-card">
              <h3>Income vs. Expenses</h3>
              <div className="chart-container">
                {userData ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart
                      data={analyticsData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatAmount(value)} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="income"
                        stroke="#10B981"
                        activeDot={{ r: 8 }}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="expenses"
                        stroke="#EF4444"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="no-data-message">
                    <p>No transaction data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default Dashboard;