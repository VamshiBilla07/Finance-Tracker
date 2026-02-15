import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePointsSystem } from '../hooks/usePointsSystem';
import { supabase } from '../services/supabaseClient';
import { useCurrency } from '../context/CurrencyContext';
import '../styles/components/PointsDashboard.css';

const PointsDashboard = () => {
  const { points, pointsBreakdown, isLoading, loadPoints } = usePointsSystem();
  const { formatAmount } = useCurrency();
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 5;
  
  useEffect(() => {
    loadPoints();
    
    // Set up real-time subscription to points table
    const subscription = supabase
      .channel('points-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'points' }, 
        () => {
          loadPoints();
        }
      )
      .subscribe();
    
    return () => {
      // Clean up subscription
      supabase.removeChannel(subscription);
    };
  }, []);

  // Get displayed history items based on pagination
  const getDisplayedHistory = () => {
    if (!pointsBreakdown) return [];
    
    if (!showAllHistory) {
      return pointsBreakdown.slice(0, 5); // Show only top 5
    }
    
    const start = (historyPage - 1) * itemsPerPage;
    return pointsBreakdown.slice(start, start + itemsPerPage);
  };
  
  // Format date helper
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div 
      className="points-dashboard"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="points-summary">
        <div className={`points-value ${points < 0 ? 'negative' : ''}`}>
          <span className="points-number">{points}</span>
          <span className="points-label">POINTS</span>
        </div>
        
        {points < 0 && (
          <div className="spending-restriction-warning">
            ⚠️ You cannot add expenses until you have positive points!
          </div>
        )}
      </div>
      
      <h3 className="points-history-title">Recent Points Activity</h3>
      
      <div className="points-history">
        {isLoading ? (
          <div className="loading-indicator">Loading points history...</div>
        ) : pointsBreakdown?.length > 0 ? (
          <>
            <div className="history-list">
              <div className="history-header">
                <div className="history-column date">Date</div>
                <div className="history-column reason">Action</div>
                <div className="history-column points-change">Points</div>
              </div>
              
              <AnimatePresence>
                {getDisplayedHistory().map((item, index) => (
                  <motion.div 
                    key={item.id || index}
                    className="history-item"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="history-column date">{formatDate(item.created_at)}</div>
                    <div className="history-column reason">{item.reason}</div>
                    <div className={`history-column points-change ${item.points_change > 0 ? 'positive' : 'negative'}`}>
                      {item.points_change > 0 ? '+' : ''}{item.points_change}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            {pointsBreakdown.length > 5 && (
              <div className="history-controls">
                {showAllHistory ? (
                  <>
                    <div className="pagination">
                      <button 
                        onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                        disabled={historyPage === 1}
                        className="pagination-button"
                      >
                        ← Prev
                      </button>
                      <span className="page-indicator">
                        Page {historyPage} of {Math.ceil(pointsBreakdown.length / itemsPerPage)}
                      </span>
                      <button 
                        onClick={() => setHistoryPage(prev => 
                          Math.min(Math.ceil(pointsBreakdown.length / itemsPerPage), prev + 1)
                        )}
                        disabled={historyPage >= Math.ceil(pointsBreakdown.length / itemsPerPage)}
                        className="pagination-button"
                      >
                        Next →
                      </button>
                    </div>
                    <button 
                      className="toggle-history-button"
                      onClick={() => setShowAllHistory(false)}
                    >
                      Show Less
                    </button>
                  </>
                ) : (
                  <button 
                    className="toggle-history-button"
                    onClick={() => {
                      setShowAllHistory(true);
                      setHistoryPage(1);
                    }}
                  >
                    Show All History
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="empty-history">
            No points activity yet. Start adding transactions!
          </div>
        )}
      </div>
      
      <div className="points-info-box">
        <h4>How Points Work</h4>
        <ul className="points-rules">
          <li>🟢 <strong>Income:</strong> +1 point for every ₹50 saved</li>
          <li>🔴 <strong>Expense:</strong> -1 point for every ₹50 spent</li>
          <li>⚠️ <strong>Budget Exceeded:</strong> -10 points penalty</li>
          <li>🚫 <strong>Too Many Transactions:</strong> -1 point per transaction beyond 3 per day</li>
          <li>🏆 <strong>Monthly Bonus:</strong> +5 points for staying within all budgets</li>
        </ul>
        <div className="spending-rule">
          You need at least 0 points to be able to add new expenses.
        </div>
      </div>
    </motion.div>
  );
};

export default PointsDashboard;
