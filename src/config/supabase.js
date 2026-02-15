import '../styles/global/global.css';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// User balances helper methods
export const userBalances = {
  // Get all balances
  getAll: async () => {
    const { data, error } = await supabase
      .from('user_balances')
      .select(`
        *,
        balance_type:balance_type_id (
          id, name, icon, is_default
        )
      `);

    return { data, error };
  },

  // Add or update a balance
  saveBalance: async (balanceTypeId, amount) => {
    // Check if balance already exists
    const { data: existingBalance } = await supabase
      .from('user_balances')
      .select('*')
      .eq('balance_type_id', balanceTypeId)
      .single();

    if (existingBalance) {
      // Update existing balance
      const { data, error } = await supabase
        .from('user_balances')
        .update({ amount })
        .match({ id: existingBalance.id })
        .select();

      return { data, error };
    } else {
      // Create new balance
      const { data, error } = await supabase
        .from('user_balances')
        .insert([
          {
            balance_type_id: balanceTypeId,
            amount,
          },
        ])
        .select();

      return { data, error };
    }
  },
};

// Transactions helper methods
export const transactions = {
  // Add a new transaction
  add: async (balanceId, amount, type, category, note) => {
    // Start a transaction to update both tables atomically
    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert([
        {
          balance_id: balanceId,
          amount,
          type, // 'income' or 'expense'
          category,
          note,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (transactionError) return { data: null, error: transactionError };

    // Get the current balance
    const { data: balanceData } = await supabase
      .from('user_balances')
      .select('amount')
      .eq('id', balanceId)
      .single();

    if (!balanceData) return { data: null, error: new Error('Balance not found') };

    // Calculate the new balance amount
    const newAmount =
      type === 'income'
        ? parseFloat(balanceData.amount) + parseFloat(amount)
        : parseFloat(balanceData.amount) - parseFloat(amount);

    // Update the balance
    const { data: updatedBalance, error: balanceError } = await supabase
      .from('user_balances')
      .update({ amount: newAmount })
      .eq('id', balanceId)
      .select();

    if (balanceError) return { data: null, error: balanceError };

    return { data: { transaction: transactionData, balance: updatedBalance }, error: null };
  },

  // Get transactions with filters
  getTransactions: async (filters = {}) => {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        balance:balance_id (
          id, 
          balance_type:balance_type_id (
            id, name, icon
          )
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.type) query = query.eq('type', filters.type);
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.balanceId) query = query.eq('balance_id', filters.balanceId);
    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
    if (filters.dateTo) query = query.lte('created_at', filters.dateTo);
    if (filters.limit) query = query.limit(filters.limit);

    const { data, error } = await query;

    return { data, error };
  },

  // Get transaction stats
  getStats: async (timeRange = 'month') => {
    let dateFrom;
    const now = new Date();

    switch (timeRange) {
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
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }

    // Get income sum
    const { data: incomeData, error: incomeError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('type', 'income')
      .gte('created_at', dateFrom);

    if (incomeError) return { data: null, error: incomeError };

    // Get expense sum
    const { data: expenseData, error: expenseError } = await supabase
      .from('transactions')
      .select('amount, category')
      .eq('type', 'expense')
      .gte('created_at', dateFrom);

    if (expenseError) return { data: null, error: expenseError };

    // Calculate totals and category breakdown
    const totalIncome = incomeData.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const totalExpense = expenseData.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    // Category breakdown
    const categories = {};
    expenseData.forEach((item) => {
      const amount = parseFloat(item.amount);
      const category = item.category || 'Other';
      
      if (categories[category]) {
        categories[category] += amount;
      } else {
        categories[category] = amount;
      }
    });

    return {
      data: {
        totalIncome,
        totalExpense,
        netFlow: totalIncome - totalExpense,
        categories,
      },
      error: null,
    };
  },
};

export default supabase;