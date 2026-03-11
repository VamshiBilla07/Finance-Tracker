import React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCategories, addCategory } from '../services/categoryService';
import '../styles/global/global.css';
import '../styles/components/CategorySelector.css';

const CategorySelector = ({ 
  value, 
  onChange, 
  label = "Category",
  placeholder = "Select a category",
  allowAddNew = true,
  disabled = false,
}) => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState(null);

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const data = await getCategories();
        setCategories(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      setIsAdding(true);
      const newCategory = await addCategory(newCategoryName.trim());
      
      setCategories([...categories, newCategory]);
      setNewCategoryName('');
      setIsAdding(false);
      setError(null);
      
      // Select the newly added category
      onChange(newCategory.id);
    } catch (err) {
      console.error('Error adding category:', err);
      setError('Failed to add new category');
      setIsAdding(false);
    }
  };

  return (
    <div className="category-selector">
      <label htmlFor="category-select">{label}</label>
      
      {isLoading ? (
        <div className="category-loading">Loading categories...</div>
      ) : (
        <div className="category-select-container">
          <select
            id="category-select"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="category-select"
            disabled={disabled}
          >
            <option value="">{placeholder}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.category_name}
              </option>
            ))}
          </select>
          
          {allowAddNew && (
            <button 
              type="button"
              className="add-category-btn"
              onClick={() => setIsAdding(!isAdding)}
              disabled={disabled}
              aria-label={isAdding ? "Cancel adding category" : "Add new category"}
            >
              {isAdding ? '✕' : '+'}
            </button>
          )}
        </div>
      )}
      
      <AnimatePresence>
        {isAdding && (
          <motion.form 
            className="add-category-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleAddCategory}
          >
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Enter new category name"
              className="new-category-input"
              disabled={isAdding && disabled}
              autoFocus
            />
            <button 
              type="submit" 
              className="save-category-btn"
              disabled={!newCategoryName.trim() || (isAdding && disabled)}
            >
              Add
            </button>
          </motion.form>
        )}
      </AnimatePresence>
      
      {error && <div className="category-error">{error}</div>}
    </div>
  );
};

export default CategorySelector;
