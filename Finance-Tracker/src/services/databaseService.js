import { supabase } from '../config/supabase';

/**
 * Validate the database schema
 * @returns {Promise<Object>} Validation results
 */
export const validateSchema = async () => {
  try {
    const requiredTables = [
      'balance_types',
      'budgets',
      'categories',
      'custom_reasons',
      'transactions',
      'user_balances',
      'users',
      'savings_points',
      'push_subscriptions'
    ];
    
    let allTablesExist = true;
    const tableStatus = {};

    for (const table of requiredTables) {
      try {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
          
        tableStatus[table] = { exists: true, count };
      } catch (tableError) {
        console.error(`Error accessing table ${table}:`, tableError);
        tableStatus[table] = { exists: false, error: tableError.message };
        allTablesExist = false;
      }
    }

    return {
      valid: allTablesExist,
      tableStatus,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Database schema validation failed:", error);
    return {
      valid: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Initialize and get balances from the database
 * @returns {Promise<Array>} Array of balance objects
 */
export const getBalances = async () => {
  try {
    // First check if table exists
    const { data: metaData, error: metaError } = await supabase
      .rpc('check_table_exists', { tablename: 'user_balances' });
    
    if (metaError || !metaData) {
      console.error("Error checking if table exists:", metaError);
      return [];
    }
    
    // Get all balances
    const { data, error } = await supabase
      .from('user_balances')
      .select(`
        *,
        balance_type:balance_type_id (
          id, name, icon, is_default
        )
      `);

    if (error) {
      console.error("Error fetching balances:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Database error in getBalances:", error);
    return [];
  }
};

/**
 * Get balance types
 * @returns {Promise<Array>} Array of balance type objects
 */
export const getBalanceTypes = async () => {
  try {
    // Get all default balance types and user's custom balance types
    const { data, error } = await supabase
      .from('balance_types')
      .select('*')
      .order('name');
      
    if (error) {
      console.error("Error fetching balance types:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Database error in getBalanceTypes:", error);
    return [];
  }
};

/**
 * Create a new balance
 * @param {Object} balanceData - Balance data
 * @returns {Promise<Object>} Created balance
 */
export const createBalance = async (balanceData) => {
  try {
    const { data, error } = await supabase
      .from('user_balances')
      .insert([balanceData])
      .select();
      
    if (error) {
      console.error("Error creating balance:", error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error("Database error in createBalance:", error);
    return { success: false, error };
  }
};

/**
 * Update an existing balance
 * @param {string} id - Balance ID
 * @param {Object} balanceData - New balance data
 * @returns {Promise<Object>} Updated balance
 */
export const updateBalance = async (id, balanceData) => {
  try {
    const { data, error } = await supabase
      .from('user_balances')
      .update(balanceData)
      .eq('id', id)
      .select();
      
    if (error) {
      console.error("Error updating balance:", error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error("Database error in updateBalance:", error);
    return { success: false, error };
  }
};

/**
 * Delete a balance
 * @param {string} id - Balance ID
 * @returns {Promise<Object>} Result of deletion
 */
export const deleteBalance = async (id) => {
  try {
    const { data, error } = await supabase
      .from('user_balances')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error("Error deleting balance:", error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Database error in deleteBalance:", error);
    return { success: false, error };
  }
};

/**
 * Create a new balance type
 * @param {Object} balanceTypeData - Balance type data
 * @returns {Promise<Object>} Created balance type
 */
export const createBalanceType = async (balanceTypeData) => {
  try {
    // Add current user ID as created_by
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData?.user) {
      return { success: false, error: "User not authenticated" };
    }
    
    const { data, error } = await supabase
      .from('balance_types')
      .insert([{
        ...balanceTypeData,
        created_by: userData.user.id,
        is_default: false
      }])
      .select();
      
    if (error) {
      console.error("Error creating balance type:", error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error("Database error in createBalanceType:", error);
    return { success: false, error };
  }
};

/**
 * Get budgets
 * @param {string} monthYear - Month and year in format 'MM-YYYY'
 * @returns {Promise<Array>} Array of budgets
 */
export const getBudgets = async (monthYear) => {
  try {
    let query = supabase
      .from('budgets')
      .select('*');
      
    if (monthYear) {
      query = query.eq('month_year', monthYear);
    }
    
    const { data, error } = await query.order('category');
      
    if (error) {
      console.error("Error fetching budgets:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Database error in getBudgets:", error);
    return [];
  }
};

/**
 * Create or update a budget
 * @param {Object} budgetData - Budget data
 * @returns {Promise<Object>} Created or updated budget
 */
export const saveBudget = async (budgetData) => {
  try {
    // Add current user ID
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData?.user) {
      return { success: false, error: "User not authenticated" };
    }
    
    // Check if budget already exists for this category and month
    const { data: existingBudget } = await supabase
      .from('budgets')
      .select('id')
      .eq('category', budgetData.category)
      .eq('month_year', budgetData.month_year)
      .eq('user_id', userData.user.id)
      .maybeSingle();
      
    let result;
    
    if (existingBudget) {
      // Update existing budget
      const { data, error } = await supabase
        .from('budgets')
        .update({
          amount: budgetData.amount
        })
        .eq('id', existingBudget.id)
        .select();
        
      result = { data, error };
    } else {
      // Create new budget
      const { data, error } = await supabase
        .from('budgets')
        .insert([{
          ...budgetData,
          user_id: userData.user.id,
          created_at: new Date().toISOString()
        }])
        .select();
        
      result = { data, error };
    }
    
    if (result.error) {
      console.error("Error saving budget:", result.error);
      return { success: false, error: result.error };
    }
    
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Database error in saveBudget:", error);
    return { success: false, error };
  }
};

/**
 * Get user's savings points
 * @param {string} monthYear - Optional month and year in format 'MM-YYYY'
 * @returns {Promise<Object>} Savings points
 */
export const getSavingsPoints = async (monthYear) => {
  try {
    // Add current user ID
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData?.user) {
      return { success: false, error: "User not authenticated" };
    }
    
    let query = supabase
      .from('savings_points')
      .select('*')
      .eq('user_id', userData.user.id);
      
    if (monthYear) {
      query = query.eq('month_year', monthYear);
    }
    
    const { data, error } = await query;
      
    if (error) {
      console.error("Error fetching savings points:", error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error("Database error in getSavingsPoints:", error);
    return { success: false, error };
  }
};

/**
 * Update or create user's savings points
 * @param {Object} pointsData - Points data
 * @returns {Promise<Object>} Updated or created savings points
 */
export const updateSavingsPoints = async (pointsData) => {
  try {
    // Add current user ID
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData?.user) {
      return { success: false, error: "User not authenticated" };
    }
    
    // Check if points already exist for this month
    const { data: existingPoints } = await supabase
      .from('savings_points')
      .select('id, points')
      .eq('month_year', pointsData.month_year)
      .eq('user_id', userData.user.id)
      .maybeSingle();
      
    let result;
    
    if (existingPoints) {
      // Update existing points
      const newPoints = (existingPoints.points || 0) + pointsData.points;
      
      const { data, error } = await supabase
        .from('savings_points')
        .update({
          points: newPoints
        })
        .eq('id', existingPoints.id)
        .select();
        
      result = { data, error };
    } else {
      // Create new points entry
      const { data, error } = await supabase
        .from('savings_points')
        .insert([{
          month_year: pointsData.month_year,
          points: pointsData.points,
          user_id: userData.user.id,
          created_at: new Date().toISOString()
        }])
        .select();
        
      result = { data, error };
    }
    
    if (result.error) {
      console.error("Error updating savings points:", result.error);
      return { success: false, error: result.error };
    }
    
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Database error in updateSavingsPoints:", error);
    return { success: false, error };
  }
};

/**
 * Save push notification subscription
 * @param {Object} subscription - Push subscription object
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Result of the operation
 */
export const savePushSubscription = async (subscription, userId) => {
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .insert([{
        subscription: {
          ...subscription,
          user_id: userId
        }
      }])
      .select();
      
    if (error) {
      console.error("Error saving push subscription:", error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error("Database error in savePushSubscription:", error);
    return { success: false, error };
  }
};

export default {
  validateSchema,
  getBalances,
  getBalanceTypes,
  createBalance,
  updateBalance,
  deleteBalance,
  createBalanceType,
  getBudgets,
  saveBudget,
  getSavingsPoints,
  updateSavingsPoints,
  savePushSubscription
};
