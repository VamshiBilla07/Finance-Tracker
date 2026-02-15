import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { supabase } from '../services/supabaseClient';
import { usePointsSystem } from '../hooks/usePointsSystem';
import '../styles/pages/PointsPage.css';

const PointsPage = () => {
  const { darkMode } = useTheme();
  const { formatAmount } = useCurrency();
  const { points, pointsBreakdown, isLoading, loadPoints } = usePointsSystem();
  
  // State variables for additional stats
  const [transactionsWithPoints, setTransactionsWithPoints] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState({
    totalPointsEarned: 0,
    totalPointsSpent: 0,
    highestMonthlyPoints: 0,
    bestCategory: 'N/A',
    worstCategory: 'N/A',
    completedTasks: 0,
    streak: 0
  });
  const [historyVisible, setHistoryVisible] = useState(false);
  const [pointsHistory, setPointsHistory] = useState([]);

  // Load points and transactions when component mounts
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // Ensure points are loaded
      await loadPoints();
      
      // Load transactions with point calculations
      await loadTransactions();
      
      // Load points history
      await loadPointsHistory();
      
      // Load completed tasks count
      await loadCompletedTasks();
      
      // Calculate streak based on transaction history
      await calculateCurrentStreak();
    } catch (error) {
      console.error('Error loading points data:', error);
    }
  };

  // Load transactions with point calculations
  const loadTransactions = async () => {
    try {
      // Fetch transactions
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
        
      if (error) throw error;
      
      // Map transactions with point calculations
      const txWithPoints = data.map(tx => {
        const amount = parseFloat(tx.amount || 0);
        // Calculate points based on the transaction amount (₹50 = 1 point)
        const pointsValue = Math.floor(Math.abs(amount) / 50) * (tx.type === 'income' ? 1 : -1);
        
        return {
          ...tx,
          pointsValue,
        };
      });
      
      setTransactionsWithPoints(txWithPoints);
      
      // Calculate stats from real transaction data
      calculateStats(txWithPoints);
      
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };
  
  // Load points history from the database
  const loadPointsHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('points_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (error) throw error;
      
      setPointsHistory(data || []);
    } catch (error) {
      console.error('Error loading points history:', error);
    }
  };
  
  // Load completed tasks count
  const loadCompletedTasks = async () => {
    try {
      // Get total number of completed tasks from completed_tasks table
      const { count, error } = await supabase
        .from('points_history')
        .select('*', { count: 'exact', head: true })
        .eq('category', 'task');
      
      if (error) throw error;
      
      setStats(prevStats => ({
        ...prevStats,
        completedTasks: count || 0
      }));
    } catch (error) {
      console.error('Error loading completed tasks:', error);
    }
  };
  
  // Calculate current streak based on daily activity
  const calculateCurrentStreak = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get all transactions ordered by date
      const { data: activities, error } = await supabase
        .from('transactions')
        .select('created_at')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (!activities || activities.length === 0) {
        setStats(prevStats => ({
          ...prevStats,
          streak: 0
        }));
        return;
      }
      
      // Calculate streak based on daily activity
      const dates = activities.map(activity => {
        const date = new Date(activity.created_at);
        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      });
      
      // Remove duplicates
      const uniqueDates = [...new Set(dates)].sort((a, b) => b - a);
      
      // Calculate streak
      let streak = 0;
      let currentDate = today.getTime();
      
      // Check if there's any activity today
      const hasActivityToday = uniqueDates.includes(currentDate);
      
      // Start from today or yesterday based on activity
      if (hasActivityToday) {
        streak = 1; // Count today
      } else {
        // Move to yesterday and start checking from there
        currentDate -= 86400000;
      }
      
      // Check consecutive days
      for (let i = hasActivityToday ? 1 : 0; i < uniqueDates.length; i++) {
        const expectedDate = currentDate;
        
        if (uniqueDates[i] === expectedDate) {
          streak++;
          currentDate -= 86400000; // Move to the previous day
        } else if (uniqueDates[i] < expectedDate) {
          // Skip ahead in our uniqueDates array
          while (i < uniqueDates.length && uniqueDates[i] < expectedDate) {
            i++;
          }
          i--; // Adjust for the loop increment
        } else {
          // Streak is broken
          break;
        }
      }
      
      setStats(prevStats => ({
        ...prevStats,
        streak: streak
      }));
      
    } catch (error) {
      console.error('Error calculating streak:', error);
    }
  };
  
  // Check for achievements based on real data
  useEffect(() => {
    if (!isLoading) {
      const achievementsList = [];
      
      // Achievement: Reach 50+ points
      if (points >= 50) {
        achievementsList.push({
          id: 'points-50',
          title: 'Financial Apprentice',
          description: 'Reached 50+ points in your finance journey',
          icon: '🥉'
        });
      }
      
      // Achievement: Reach 100+ points
      if (points >= 100) {
        achievementsList.push({
          id: 'points-100',
          title: 'Finance Adept',
          description: 'Collected over 100 finance points',
          icon: '🥈'
        });
      }
      
      // Achievement: Reach 200+ points
      if (points >= 200) {
        achievementsList.push({
          id: 'points-200',
          title: 'Money Master',
          description: 'Mastered financial habits with 200+ points',
          icon: '🥇'
        });
      }
      
      // Achievement: Reach 500+ points
      if (points >= 500) {
        achievementsList.push({
          id: 'points-500',
          title: 'Financial Wizard',
          description: 'Elite financial status with 500+ points',
          icon: '🏆'
        });
      }
      
      // Add achievement based on transactions
      if (transactionsWithPoints.length > 50) {
        achievementsList.push({
          id: 'tx-50',
          title: 'Transaction Master',
          description: 'Tracked over 50 financial transactions',
          icon: '📊'
        });
      }
      
      // Add achievement for positive points
      if (points > 0) {
        achievementsList.push({
          id: 'positive-balance',
          title: 'In The Green',
          description: 'Maintaining a positive points balance',
          icon: '💹'
        });
      }
      
      // Add streak achievement if applicable
      if (stats.streak >= 7) {
        achievementsList.push({
          id: 'week-streak',
          title: 'Weekly Warrior',
          description: 'Maintained financial discipline for 7+ days',
          icon: '🔥'
        });
      }
      
      setAchievements(achievementsList);
    }
  }, [points, isLoading, transactionsWithPoints.length, stats.streak]);
  
  // Calculate stats from transactions using real database data
  const calculateStats = (transactions) => {
    if (!transactions || transactions.length === 0) {
      return;
    }
    
    // Total points earned (positive transactions)
    const totalEarned = transactions
      .filter(tx => tx.pointsValue > 0)
      .reduce((sum, tx) => sum + tx.pointsValue, 0);
      
    // Total points spent (negative transactions)
    const totalSpent = transactions
      .filter(tx => tx.pointsValue < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.pointsValue), 0);
    
    // Group by month for highest monthly points
    const monthlyPoints = {};
    transactions.forEach(tx => {
      const date = new Date(tx.created_at);
      const monthYear = `${date.getMonth()}-${date.getFullYear()}`;
      if (!monthlyPoints[monthYear]) monthlyPoints[monthYear] = 0;
      monthlyPoints[monthYear] += tx.pointsValue;
    });
    
    const highestMonthlyPoints = Object.values(monthlyPoints).length > 0
      ? Math.max(...Object.values(monthlyPoints), 0)
      : 0;
      
    // Group by category to find best and worst
    const categoryPoints = {};
    transactions.forEach(tx => {
      if (!tx.category) return;
      if (!categoryPoints[tx.category]) categoryPoints[tx.category] = 0;
      categoryPoints[tx.category] += tx.pointsValue;
    });
    
    let bestCategory = 'N/A';
    let worstCategory = 'N/A';
    let highestPoints = -Infinity;
    let lowestPoints = Infinity;
    
    Object.entries(categoryPoints).forEach(([category, points]) => {
      if (points > highestPoints) {
        highestPoints = points;
        bestCategory = category;
      }
      if (points < lowestPoints) {
        lowestPoints = points;
        worstCategory = category;
      }
    });
    
    setStats(prevStats => ({
      ...prevStats,
      totalPointsEarned: Math.max(totalEarned, 0),
      totalPointsSpent: Math.max(totalSpent, 0),
      highestMonthlyPoints: Math.max(highestMonthlyPoints, 0),
      bestCategory: bestCategory || 'N/A',
      worstCategory: worstCategory || 'N/A',
    }));
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        type: "spring",
        stiffness: 260,
        damping: 20
      }
    }
  };

  // Format date helper
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`points-page ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="points-container">
        <motion.div 
          className="points-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1>Finance Points System</h1>
          <p>Track your financial discipline and get rewarded for good habits</p>
        </motion.div>
        
        {/* Main Dashboard with Points */}
        <motion.div 
          className="points-dashboard"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="points-display">
            <motion.div 
              className="points-circle"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                duration: 0.5, 
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.2
              }}
            >
              <motion.div 
                className="points-value"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                {isLoading ? '...' : points}
              </motion.div>
              <div className="points-label">Finance Points</div>
            </motion.div>
          </div>
          
          <motion.div 
            className="points-details"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div className="detail-card" variants={itemVariants}>
              <div className="detail-icon">💰</div>
              <div className="detail-value">{stats.totalPointsEarned}</div>
              <div className="detail-label">Points Earned</div>
            </motion.div>
            
            <motion.div className="detail-card" variants={itemVariants}>
              <div className="detail-icon">💸</div>
              <div className="detail-value">{stats.totalPointsSpent}</div>
              <div className="detail-label">Points Spent</div>
            </motion.div>
            
            <motion.div className="detail-card" variants={itemVariants}>
              <div className="detail-icon">🔥</div>
              <div className="detail-value">{stats.streak}</div>
              <div className="detail-label">Day Streak</div>
            </motion.div>
            
            <motion.div className="detail-card" variants={itemVariants}>
              <div className="detail-icon">✅</div>
              <div className="detail-value">{stats.completedTasks}</div>
              <div className="detail-label">Tasks Complete</div>
            </motion.div>
          </motion.div>
          
          {/* Points History Toggle Button */}
          <motion.button
            className="history-toggle-button"
            onClick={() => setHistoryVisible(!historyVisible)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{
              margin: '1.5rem auto 0',
              padding: '0.8rem 1.2rem',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '12px',
              color: 'var(--color-textPrimary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '500',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <span>{historyVisible ? 'Hide' : 'Show'} Points History</span>
            <span>{historyVisible ? '▲' : '▼'}</span>
          </motion.button>
          
          {/* Points History (Conditionally Rendered) */}
          <AnimatePresence>
            {historyVisible && (
              <motion.div
                className="points-history"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  overflow: 'hidden',
                  marginTop: '1rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ 
                    margin: '0 0 1rem', 
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: 'var(--color-textPrimary)'
                  }}>
                    Recent Points Activity
                  </h3>
                  
                  {pointsHistory.length > 0 ? (
                    <div style={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.8rem'
                    }}>
                      {pointsHistory.map((item, index) => (
                        <div key={item.id || index} style={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '0.8rem',
                          borderBottom: index === pointsHistory.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
                          fontSize: '0.9rem'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <span style={{ color: 'var(--color-textPrimary)', fontWeight: '500' }}>
                              {item.reason || 'Points update'}
                            </span>
                            <span style={{ color: 'var(--color-textSecondary)', fontSize: '0.8rem' }}>
                              {formatDate(item.created_at)}
                            </span>
                          </div>
                          <div style={{ 
                            fontWeight: '600',
                            color: item.points_change >= 0 ? '#10b981' : '#f43f5e'
                          }}>
                            {item.points_change >= 0 ? '+' : ''}{item.points_change} pts
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ 
                      textAlign: 'center',
                      padding: '1.5rem 0',
                      color: 'var(--color-textSecondary',
                      fontSize: '0.9rem'
                    }}>
                      No recent points activity to display
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        
        <div className="points-content-grid">
          {/* Achievements Section */}
          <motion.div 
            className="points-achievements"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2>Your Achievements</h2>
            
            <div className="achievements-list">
              {achievements.length > 0 ? (
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                  {achievements.map(achievement => (
                    <motion.div 
                      key={achievement.id} 
                      className="achievement-card"
                      variants={itemVariants}
                    >
                      <div className="achievement-icon">{achievement.icon}</div>
                      <div className="achievement-details">
                        <h3>{achievement.title}</h3>
                        <p>{achievement.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="empty-achievements">
                  <div className="empty-icon">🏅</div>
                  <h3>No Achievements Yet</h3>
                  <p>Keep saving and managing your money well to unlock achievements!</p>
                </div>
              )}
            </div>
          </motion.div>
          
          {/* Stats Section */}
          <motion.div 
            className="points-stats"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h2>Points Statistics</h2>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Best Month</div>
                <div className="stat-value">+{stats.highestMonthlyPoints}</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-label">Best Category</div>
                <div className="stat-value">{stats.bestCategory}</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-label">Points Balance</div>
                <div className={`stat-value ${points >= 0 ? 'positive' : 'negative'}`}>
                  {points >= 0 ? '+' : ''}{points}
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-label">Needs Improvement</div>
                <div className="stat-value">{stats.worstCategory}</div>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Rules and Explanations */}
        <motion.div 
          className="points-rules-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2>Points System Rules</h2>
          
          <div className="rules-grid">
            <div className="rule-card">
              <div className="rule-icon">💰</div>
              <h3>Income Points</h3>
              <p>For every ₹50 saved, you earn 1 point.</p>
              <div className="example">Example: ₹1000 income = +20 points</div>
            </div>
            
            <div className="rule-card">
              <div className="rule-icon">💸</div>
              <h3>Expense Points</h3>
              <p>For every ₹50 spent, you lose 1 point.</p>
              <div className="example">Example: ₹500 expense = -10 points</div>
            </div>
            
            <div className="rule-card">
              <div className="rule-icon">📊</div>
              <h3>Budget Discipline</h3>
              <p>Exceeding any budget category costs you 10 points.</p>
              <div className="example">Example: Food budget ₹2000, spent ₹2100 = -10 points</div>
            </div>
            
            <div className="rule-card">
              <div className="rule-icon">🔄</div>
              <h3>Transaction Frequency</h3>
              <p>More than 3 transactions in a day costs 1 point each.</p>
              <div className="example">Example: 5 transactions in one day = -2 points</div>
            </div>
            
            <div className="rule-card">
              <div className="rule-icon">🏆</div>
              <h3>Monthly Bonus</h3>
              <p>Stay within all budgets for a month to earn 5 bonus points!</p>
              <div className="example">Example: All budgets followed = +5 points</div>
            </div>
            
            <div className="rule-card warning">
              <div className="rule-icon">⚠️</div>
              <h3>Spending Restriction</h3>
              <p>You need at least 0 points to be able to spend money.</p>
              <div className="example">If points are negative, save money first!</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PointsPage;
