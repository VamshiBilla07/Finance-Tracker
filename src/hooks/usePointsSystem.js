import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';
import { CATEGORY_TO_BUDGET_MAP } from '../constants/categories';

export const usePointsSystem = () => {
  const [points, setPoints] = useState(0);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pointsBreakdown, setPointsBreakdown] = useState([]);
  const [canSpend, setCanSpend] = useState(true);
  
  // Always consider user as authenticated in single-user mode
  const userAuthenticated = true;

  // Load points on component mount
  useEffect(() => {
    loadPoints();
  }, []);

  // Set canSpend based on points value
  useEffect(() => {
    setCanSpend(points >= 0);
  }, [points]);

  const loadPoints = async () => {
    try {
      setIsLoading(true);
      
      // Get points from database
      const { data: pointsData, error: pointsError } = await supabase
        .from('points')
        .select('points')
        .single();
      
      if (pointsError) {
        console.error('Error loading points:', pointsError);
        
        // If no points record exists, create one
        if (pointsError.code === 'PGRST116') { // No rows returned
          const { data, error: createError } = await supabase
            .from('points')
            .insert([{ points: 0 }])
            .select();
          
          if (createError) {
            console.error('Error creating points record:', createError);
          } else {
            console.log('Created new points record');
            setPoints(0);
          }
        }
      } else if (pointsData) {
        setPoints(pointsData.points || 0);
      }
      
      // Load points history/breakdown
      await loadPointsBreakdown();
      
    } catch (error) {
      console.error('Error loading points:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load detailed points breakdown
  const loadPointsBreakdown = async () => {
    try {
      const { data, error } = await supabase
        .from('points_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      
      setPointsBreakdown(data || []);
    } catch (error) {
      console.error('Error loading points breakdown:', error);
    }
  };

  // Record points change with reason
  const recordPointsChange = async (changeAmount, reason, category = 'transaction') => {
    try {
      const { error } = await supabase
        .from('points_history')
        .insert([{
          points_change: changeAmount,
          reason: reason,
          category: category,
          created_at: new Date().toISOString()
        }]);
        
      if (error) throw error;
      
      // Refresh points breakdown
      await loadPointsBreakdown();
    } catch (error) {
      console.error('Error recording points change:', error);
    }
  };

  // Add points function with customizable toast notification
  const addPoints = async (amount, reason = '', category = 'action', showNotification = true) => {
    if (!amount || isNaN(Number(amount))) return;
    
    try {
      // Get current points record
      const { data: currentData, error: fetchError } = await supabase
        .from('points')
        .select('id, points')
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching points:', fetchError);
        return;
      }
      
      const currentPoints = currentData?.points || 0;
      const newPoints = currentPoints + amount;
      
      if (currentData?.id) {
        // Update existing points record
        const { error: updateError } = await supabase
          .from('points')
          .update({ points: newPoints })
          .eq('id', currentData.id);
        
        if (updateError) {
          console.error('Error updating points:', updateError);
        }
      } else {
        // Create new points record
        const { error: insertError } = await supabase
          .from('points')
          .insert([{ points: amount }]);
        
        if (insertError) {
          console.error('Error creating points record:', insertError);
        }
      }
      
      // Record the points change
      await recordPointsChange(amount, reason, category);
      
      // Update local state
      setPoints(newPoints);
      
      // Show toast notification if requested
      if (showNotification) {
        const isPositive = amount > 0;
        toast.success(`${isPositive ? '+' : ''}${amount} points! ${reason}`, {
          duration: 4000,
          style: {
            background: isPositive ? '#10B981' : '#F43F5E',
            color: 'white',
            fontWeight: 'bold',
            padding: '16px',
            borderRadius: '10px',
          },
          icon: isPositive ? '🏆' : '📉',
        });

        // Try to play a sound
        try {
          const audioFile = isPositive ? '/sounds/point-earned.mp3' : '/sounds/point-lost.mp3';
          const audio = new Audio(audioFile);
          audio.volume = 0.5;
          await audio.play();
        } catch (e) {
          console.log('Audio playback prevented by browser policy');
        }
      }
      
    } catch (error) {
      console.error('Error adding points:', error);
      
      if (showNotification) {
        toast.success(`${amount > 0 ? '+' : ''}${amount} points! ${reason}`);
      }
    }
  };

  // Calculate points from transaction amount (₹50 = 1 point)
  const calculatePointsFromTransaction = (amount, type) => {
    // Convert amount to points (₹50 = 1 point)
    const points = Math.floor(amount / 50);
    
    // For income (savings), add points; for expenses, SUBTRACT points
    return type === 'income' ? points : -points; // Make sure expense is negative
  };

  // Check for transaction frequency penalties
  const checkTransactionFrequency = async (transactionDate) => {
    try {
      // Format the date to YYYY-MM-DD for comparison
      const dateOnly = transactionDate.substring(0, 10);
      
      // Get transactions for the same day
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('id')
        .ilike('created_at', `${dateOnly}%`);
        
      if (error) throw error;
      
      // Count transactions for the day (including the new one)
      const txCount = (transactions?.length || 0) + 1;
      
      // If more than 3 transactions in a day, apply penalty
      if (txCount > 3) {
        // -1 point per transaction beyond 3
        await addPoints(
          -1, 
          `Too many transactions today (${txCount}/3)`,
          'frequency_penalty',
          true
        );
        return -1; // Return penalty amount
      }
      
      return 0; // No penalty
    } catch (error) {
      console.error('Error checking transaction frequency:', error);
      return 0;
    }
  };

  // Check if budget is exceeded and apply penalty if needed
  const checkBudgetExceeded = async (category_id, amount, type) => {
    if (type !== 'expense') return 0;
    
    try {
      // Map the category_id to the budget category name
      const budgetCategory = CATEGORY_TO_BUDGET_MAP[category_id] || 'Other';
      
      // Get the current month and year
      const now = new Date();
      const monthYear = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
      
      // Find budget for this category and month
      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('category', budgetCategory)
        .eq('month_year', monthYear)
        .maybeSingle();
        
      if (budgetError) throw budgetError;
      
      // If no budget for this category, no penalty
      if (!budget) return 0;
      
      // Get all expenses for this category and month
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
      
      const { data: expenses, error: expensesError } = await supabase
        .from('transactions')
        .select('amount, category_id')
        .eq('type', 'expense')
        .gte('created_at', startDate)
        .lte('created_at', endDate);
        
      if (expensesError) throw expensesError;
      
      // Filter expenses by the budget category (using our category mapping)
      const categoryExpenses = expenses.filter(exp => 
        CATEGORY_TO_BUDGET_MAP[exp.category_id] === budgetCategory
      );
      
      // Calculate total spent including the new expense
      const totalSpent = categoryExpenses.reduce(
        (sum, tx) => sum + parseFloat(tx.amount || 0), 0
      ) + amount;
      
      // Check if budget is exceeded
      if (totalSpent > budget.amount) {
        // Apply penalty for exceeding budget
        await addPoints(
          -10, 
          `Budget exceeded for ${budgetCategory}`,
          'budget_penalty',
          true
        );
        return -10;
      }
      
      return 0;
    } catch (error) {
      console.error('Error checking budget exceeded:', error);
      return 0;
    }
  };

  // Update points based on a transaction
  const updatePointsFromTransaction = async (transaction) => {
    try {
      if (!transaction || !transaction.amount || !transaction.type) {
        console.error('Invalid transaction data for points calculation');
        return;
      }
      
      const amount = parseFloat(transaction.amount);
      
      // 1. Basic points calculation based on amount
      const basePoints = calculatePointsFromTransaction(amount, transaction.type);
      
      // 2. Check for transaction frequency penalties
      const frequencyPenalty = await checkTransactionFrequency(transaction.created_at);
      
      // 3. Check for budget exceeded penalties (only for expenses)
      const budgetPenalty = transaction.type === 'expense' 
        ? await checkBudgetExceeded(transaction.category_id, amount, transaction.type)
        : 0;
      
      // Total points to add
      const pointsToAdd = basePoints + frequencyPenalty + budgetPenalty;
      
      // Get current points record
      const { data: currentData, error: fetchError } = await supabase
        .from('points')
        .select('id, points')
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching points:', fetchError);
        return;
      }
      
      const currentPoints = currentData?.points || 0;
      const newPoints = currentPoints + pointsToAdd;
      
      // Update points in database
      if (currentData?.id) {
        const { error: updateError } = await supabase
          .from('points')
          .update({ points: newPoints })
          .eq('id', currentData.id);
        
        if (updateError) {
          console.error('Error updating points:', updateError);
        }
      } else {
        const { error: insertError } = await supabase
          .from('points')
          .insert([{ points: pointsToAdd }]);
        
        if (insertError) {
          console.error('Error creating points record:', insertError);
        }
      }
      
      // Update local state
      setPoints(newPoints);
      
      // Record the transaction-based points change
      await recordPointsChange(
        pointsToAdd, 
        transaction.type === 'income' 
          ? `Saved ${formatAmount(amount)}`
          : `Spent ${formatAmount(amount)}`,
        'transaction'
      );
      
      // Show toast notification for significant points changes
      if (Math.abs(pointsToAdd) >= 1) {
        // Create message that includes all point components
        let message = transaction.type === 'income' 
          ? `+${basePoints} points for saving money!` 
          : `${basePoints} points for this expense`;
          
        if (frequencyPenalty !== 0) {
          message += ` (${frequencyPenalty} frequency penalty)`;
        }
        
        if (budgetPenalty !== 0) {
          message += ` (${budgetPenalty} budget penalty)`;
        }
        
        toast.success(message, { 
          duration: 3000,
          style: {
            background: transaction.type === 'income' ? '#10B981' : '#F43F5E',
            color: 'white',
            fontWeight: 'bold',
          },
          icon: transaction.type === 'income' ? '🏆' : '📊',
        });
      }
      
    } catch (error) {
      console.error('Error updating points from transaction:', error);
    }
  };

  // Check if user can spend (has 0 or more points)
  const canUserSpend = () => {
    return points >= 0;
  };

  // Format amount helper
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Check if all budgets were followed for end-of-month bonus
  const checkMonthEndBonus = async () => {
    try {
      // Get the previous month
      const now = new Date();
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1);
      const monthYear = `${prevMonth.toLocaleString('default', { month: 'long' })} ${prevMonth.getFullYear()}`;
      
      // Get all budgets for previous month
      const { data: budgets, error: budgetsError } = await supabase
        .from('budgets')
        .select('*')
        .eq('month_year', monthYear);
        
      if (budgetsError) throw budgetsError;
      
      // If no budgets, no bonus
      if (!budgets || budgets.length === 0) return;
      
      // Get date range for previous month
      const startDate = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1).toISOString();
      const endDate = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).toISOString();
      
      // Check each budget
      let allBudgetsFollowed = true;
      
      for (const budget of budgets) {
        // Get expenses for this category and month
        const { data: expenses, error: expensesError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('category', budget.category)
          .eq('type', 'expense')
          .gte('created_at', startDate)
          .lte('created_at', endDate);
          
        if (expensesError) throw expensesError;
        
        // Calculate total spent
        const totalSpent = (expenses || []).reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
        
        // Check if budget was exceeded
        if (totalSpent > budget.amount) {
          allBudgetsFollowed = false;
          break;
        }
      }
      
      // If all budgets were followed, award bonus
      if (allBudgetsFollowed) {
        await addPoints(
          5, 
          `Bonus: All budgets followed for ${monthYear}!`,
          'month_bonus',
          true
        );
      }
      
    } catch (error) {
      console.error('Error checking month-end bonus:', error);
    }
  };

  return {
    points,
    pointsHistory,
    pointsBreakdown,
    isLoading,
    addPoints,
    loadPoints,
    userAuthenticated,
    calculatePointsFromTransaction,
    updatePointsFromTransaction,
    canUserSpend,
    canSpend,
    checkMonthEndBonus,
    checkTransactionFrequency,
    checkBudgetExceeded
  };
};
