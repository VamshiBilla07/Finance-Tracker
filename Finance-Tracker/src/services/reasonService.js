import { supabase } from './supabaseClient';
import '../styles/global/global.css';

/**
 * Fetch custom reasons with filtering options
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object>} - Result object with success status and data
 */
export const getCustomReasons = async (filters = {}) => {
  try {
    console.log('Fetching custom reasons with filters:', filters);
    
    let query = supabase.from('custom_reasons').select('*');
    
    // Apply filters if provided
    if (filters.type) query = query.eq('type', filters.type);
    if (filters.reason_type) query = query.eq('reason_type', filters.reason_type);
    if (filters.category) query = query.eq('category', filters.category);
    
    // Order by creation date (newest first)
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase error fetching reasons:', error);
      throw error;
    }
    
    console.log(`Found ${data?.length || 0} custom reasons`);
    
    return {
      success: true,
      data: data || []
    };
  } catch (error) {
    console.error('Error in getCustomReasons:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to fetch custom reasons'
      },
      data: []
    };
  }
};

/**
 * Get reasons by type and category
 * @param {string} type - 'expense' or 'income'
 * @param {string} category - Category name
 * @returns {Promise<Object>} - Result object with success status and data
 */
export const getReasonsByTypeAndCategory = async (type, category) => {
  try {
    if (!type || !category) {
      return {
        success: false,
        error: { message: 'Type and category are required' },
        data: []
      };
    }
    
    console.log(`Fetching ${type} reasons for category: ${category}`);
    
    const { data, error } = await supabase
      .from('custom_reasons')
      .select('*')
      .eq('type', type)
      .eq('category', category)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return {
      success: true,
      data: data || []
    };
  } catch (error) {
    console.error(`Error fetching ${type} reasons for ${category}:`, error);
    return {
      success: false,
      error: { message: error.message },
      data: []
    };
  }
};

/**
 * Create a new custom reason
 * @param {Object} reasonData - The reason data to create
 * @returns {Promise<Object>} - Result object with success status and data
 */
export const createCustomReason = async (reasonData) => {
  try {
    if (!reasonData.reason_text) {
      throw new Error('Reason text is required');
    }
    
    if (!reasonData.type) {
      throw new Error('Type (income/expense) is required');
    }
    
    if (!reasonData.category) {
      throw new Error('Category is required');
    }
    
    // Log for debugging
    console.log('Creating custom reason with data:', reasonData);
    
    // Create a properly formatted object that matches the database schema
    const dataToInsert = {
      reason_text: reasonData.reason_text.trim(),
      category: reasonData.category,
      type: reasonData.type, // 'income' or 'expense'
      reason_type: reasonData.reason_type || 'transaction',
      created_at: new Date().toISOString()
      // user_id will be handled by RLS policies
    };
    
    const { data, error } = await supabase
      .from('custom_reasons')
      .insert([dataToInsert])
      .select();
    
    if (error) {
      console.error('Error creating custom reason:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      throw new Error('No data returned after creating reason');
    }
    
    console.log('Successfully created custom reason:', data[0]);
    
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error in createCustomReason:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to create custom reason',
        details: error
      }
    };
  }
};

/**
 * Update an existing custom reason
 * @param {string|number} id - The reason ID to update
 * @param {Object} reasonData - The updated reason data
 * @returns {Promise<Object>} - Result object with success status
 */
export const updateCustomReason = async (id, reasonData) => {
  try {
    if (!id) {
      throw new Error('Reason ID is required');
    }
    
    if (!reasonData.reason_text?.trim()) {
      throw new Error('Reason text is required');
    }
    
    const { data, error } = await supabase
      .from('custom_reasons')
      .update({
        reason_text: reasonData.reason_text.trim(),
        category: reasonData.category,
        type: reasonData.type,
        reason_type: reasonData.reason_type
      })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error updating custom reason:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to update custom reason'
      }
    };
  }
};

/**
 * Delete a custom reason
 * @param {string|number} id - The reason ID to delete
 * @returns {Promise<Object>} - Result object with success status
 */
export const deleteCustomReason = async (id) => {
  try {
    if (!id) {
      throw new Error('Reason ID is required');
    }
    
    const { error } = await supabase
      .from('custom_reasons')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error deleting custom reason:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete custom reason'
      }
    };
  }
};

/**
 * Debug function to check if the custom_reasons table exists and has the correct structure
 */
export const debugCustomReasonsTable = async () => {
  try {
    console.log('Debugging custom_reasons table...');
    
    // Try to get the definition
    const { data: tableData, error: tableError } = await supabase
      .from('custom_reasons')
      .select('*')
      .limit(1);
      
    if (tableError) {
      console.error('Table error:', tableError);
      return {
        exists: false,
        error: tableError.message
      };
    }
    
    // Try to insert a test record
    const testReason = {
      reason_text: 'TEST_DEBUG_REASON',
      category: 'Test',
      type: 'expense',
      reason_type: 'transaction',
      created_at: new Date().toISOString()
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('custom_reasons')
      .insert([testReason])
      .select();
      
    if (insertError) {
      console.error('Insert test error:', insertError);
      return {
        exists: true,
        canInsert: false,
        error: insertError.message
      };
    }
    
    // Clean up the test record
    if (insertData && insertData[0]?.id) {
      await supabase
        .from('custom_reasons')
        .delete()
        .eq('id', insertData[0].id);
    }
    
    return {
      exists: true,
      canInsert: true,
      success: true
    };
  } catch (error) {
    console.error('Debug error:', error);
    return {
      error: error.message
    };
  }
};

export default {
  getCustomReasons,
  createCustomReason,
  updateCustomReason,
  deleteCustomReason,
  getReasonsByTypeAndCategory,
  debugCustomReasonsTable
};
