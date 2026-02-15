import { supabase } from '../config/supabase';

/**
 * Get all transactions with optional filters
 * @param {Object} filters - Optional filters for transactions
 * @returns {Promise<Object>} Transaction data and result info
 */
export const getTransactions = async (filters = {}) => {
  try {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        balance_type:balance_type_id (
          id, name, icon
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.type) query = query.eq('type', filters.type);
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.balance_type_id) query = query.eq('balance_type_id', filters.balance_type_id);
    if (filters.reason) query = query.eq('reason', filters.reason);
    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
    if (filters.dateTo) query = query.lte('created_at', filters.dateTo);
    if (filters.limit) query = query.limit(filters.limit);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching transactions:", error);
      return { success: false, error, data: [], count: 0 };
    }
    
    return { success: true, data: data || [], count };
  } catch (error) {
    console.error("Error in getTransactions:", error);
    return { success: false, error, data: [], count: 0 };
  }
};

/**
 * Create a new transaction and update balance
 * @param {Object} transactionData - Transaction data
 * @returns {Promise<Object>} Created transaction and updated balance
 */
export const createTransaction = async (transactionData) => {
  try {
    // Insert the transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert([{
        ...transactionData,
        created_at: new Date().toISOString()
      }])
      .select();
      
    if (transactionError) {
      console.error("Error creating transaction:", transactionError);
      return { success: false, error: transactionError };
    }
    
    // Get the current balance
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_balances')
      .select('amount')
      .eq('balance_type_id', transactionData.balance_type_id)
      .single();
      
    if (balanceError && balanceError.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is fine - we'll create a new balance
      console.error("Error fetching balance:", balanceError);
      return { success: true, data: { transaction } }; // Still return transaction but no balance update
    }
    
    // Calculate new balance amount
    const currentAmount = balanceData?.amount || 0;
    const amount = parseFloat(transactionData.amount);
    let newAmount = currentAmount;
    
    if (transactionData.type === 'income') {
      newAmount = parseFloat(currentAmount) + amount;
    } else if (transactionData.type === 'expense') {
      newAmount = parseFloat(currentAmount) - amount;
    }
    
    // Update the balance
    const { data: updatedBalance, error: updateError } = await supabase
      .from('user_balances')
      .upsert([
        {
          balance_type_id: transactionData.balance_type_id,
          amount: newAmount
        }
      ])
      .select();
      
    if (updateError) {
      console.error("Error updating balance:", updateError);
      return { success: true, data: { transaction } }; // Still return transaction but no balance update
    }
    
    return { 
      success: true, 
      data: { 
        transaction, 
        balance: updatedBalance 
      } 
    };
  } catch (error) {
    console.error("Error in createTransaction:", error);
    return { success: false, error };
  }
};

/**
 * Get a single transaction by ID
 * @param {string} id - Transaction ID
 * @returns {Promise<Object>} Transaction data
 */
export const getTransactionById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        balance_type:balance_type_id (
          id, name, icon
        )
      `)
      .eq('id', id)
      .single();
      
    if (error) {
      console.error("Error fetching transaction:", error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error("Error in getTransactionById:", error);
    return { success: false, error };
  }
};

/**
 * Delete a transaction and update balance
 * @param {string} id - Transaction ID
 * @returns {Promise<Object>} Result of deletion
 */
export const deleteTransaction = async (id) => {
  try {
    // First get the transaction to know how to adjust the balance
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      console.error("Error fetching transaction for deletion:", fetchError);
      return { success: false, error: fetchError };
    }
    
    // Delete the transaction
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
      
    if (deleteError) {
      console.error("Error deleting transaction:", deleteError);
      return { success: false, error: deleteError };
    }
    
    // Get the current balance
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_balances')
      .select('amount')
      .eq('balance_type_id', transaction.balance_type_id)
      .single();
      
    if (balanceError) {
      console.error("Error fetching balance for adjustment:", balanceError);
      return { success: true }; // Transaction was deleted, but balance couldn't be adjusted
    }
    
    // Calculate new balance amount (reverse the original transaction)
    const currentAmount = parseFloat(balanceData.amount);
    const amount = parseFloat(transaction.amount);
    let newAmount = currentAmount;
    
    if (transaction.type === 'income') {
      newAmount = currentAmount - amount; // Reverse income
    } else if (transaction.type === 'expense') {
      newAmount = currentAmount + amount; // Reverse expense
    }
    
    // Update the balance
    const { error: updateError } = await supabase
      .from('user_balances')
      .update({ amount: newAmount })
      .eq('balance_type_id', transaction.balance_type_id);
      
    if (updateError) {
      console.error("Error adjusting balance after deletion:", updateError);
      return { success: true }; // Transaction was deleted, but balance couldn't be adjusted
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error in deleteTransaction:", error);
    return { success: false, error };
  }
};

/**
 * Get transaction statistics
 * @param {Object} filters - Optional filters
 * @returns {Promise<Object>} Transaction statistics
 */
export const getTransactionStats = async (filters = {}) => {
  try {
    let dateFrom;
    
    if (filters.timeRange) {
      const now = new Date();
      
      switch (filters.timeRange) {
        case 'day':
          dateFrom = new Date(now.setHours(0, 0, 0, 0)).toISOString();
          break;
        case 'week':
          const day = now.getDay();
          dateFrom = new Date(now.setDate(now.getDate() - day)).toISOString();
          break;
        case 'month':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          break;
        case 'year':
          dateFrom = new Date(now.getFullYear(), 0, 1).toISOString();
          break;
        default:
          dateFrom = filters.dateFrom || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      }
    } else {
      dateFrom = filters.dateFrom;
    }
    
    // Get income transactions
    const incomeFilters = { ...filters, type: 'income', dateFrom };
    const { data: incomeData } = await getTransactions(incomeFilters);
    
    // Get expense transactions
    const expenseFilters = { ...filters, type: 'expense', dateFrom };
    const { data: expenseData } = await getTransactions(expenseFilters);
    
    // Calculate totals
    const totalIncome = incomeData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const totalExpense = expenseData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    
    // Calculate category breakdown for expenses
    const expensesByCategory = {};
    for (const expense of expenseData) {
      const category = expense.category || 'Other';
      const amount = parseFloat(expense.amount || 0);
      
      if (!expensesByCategory[category]) {
        expensesByCategory[category] = 0;
      }
      expensesByCategory[category] += amount;
    }
    
    // Calculate recent day-by-day data for chart
    const days = 7;
    const dailyData = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStr = date.toISOString().split('T')[0];
      
      const dayIncome = incomeData
        .filter(t => t.created_at.startsWith(dayStr))
        .reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        
      const dayExpense = expenseData
        .filter(t => t.created_at.startsWith(dayStr))
        .reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
      
      dailyData.unshift({
        date: dayStr,
        income: dayIncome,
        expense: dayExpense
      });
    }
    
    return {
      success: true,
      data: {
        totalIncome,
        totalExpense,
        netFlow: totalIncome - totalExpense,
        expensesByCategory,
        dailyData
      }
    };
  } catch (error) {
    console.error("Error in getTransactionStats:", error);
    return { success: false, error };
  }
};

export default {
  getTransactions,
  createTransaction,
  getTransactionById,
  deleteTransaction,
  getTransactionStats
};
