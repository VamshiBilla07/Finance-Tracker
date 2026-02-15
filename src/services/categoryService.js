import { supabase } from '../config/supabase';
import '../styles/global/global.css';

/**
 * Get all categories
 * @returns {Promise<Object>} Result object with success status and data/error
 */
export const getCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('category_name');
      
    if (error) {
      console.error("Error fetching categories:", error);
      return { success: false, error, data: [] };
    }
    
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error in getCategories:", error);
    return { success: false, error, data: [] };
  }
};

/**
 * Create a new category
 * @param {Object} categoryData - Category data with category_name property
 * @returns {Promise<Object>} Result object with success status and data/error
 */
export const createCategory = async (categoryData) => {
  try {
    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData?.user) {
      return { success: false, error: "User not authenticated" };
    }
    
    // Create the category
    const { data, error } = await supabase
      .from('categories')
      .insert([{
        ...categoryData,
        user_id: userData.user.id,
        created_at: new Date().toISOString()
      }])
      .select();
      
    if (error) {
      console.error("Error creating category:", error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error("Error in createCategory:", error);
    return { success: false, error };
  }
};

/**
 * Update a category
 * @param {string} id - Category ID
 * @param {Object} categoryData - Updated category data
 * @returns {Promise<Object>} Result object with success status and data/error
 */
export const updateCategory = async (id, categoryData) => {
  try {
    // Check user ownership first
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return { success: false, error: "User not authenticated" };
    }
    
    // Update the category
    const { data, error } = await supabase
      .from('categories')
      .update(categoryData)
      .eq('id', id)
      .eq('user_id', userData.user.id)
      .select();
      
    if (error) {
      console.error("Error updating category:", error);
      return { success: false, error };
    }
    
    // Check if anything was actually updated
    if (!data || data.length === 0) {
      return { 
        success: false, 
        error: { message: "Category not found or you don't have permission to update it" }
      };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error("Error in updateCategory:", error);
    return { success: false, error };
  }
};

/**
 * Delete a category
 * @param {string} id - Category ID
 * @returns {Promise<Object>} Result object with success status and data/error
 */
export const deleteCategory = async (id) => {
  try {
    // Check user ownership first
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return { success: false, error: "User not authenticated" };
    }
    
    // Delete the category
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', userData.user.id);
      
    if (error) {
      console.error("Error deleting category:", error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error in deleteCategory:", error);
    return { success: false, error };
  }
};

export default {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
