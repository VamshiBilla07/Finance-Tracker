/**
 * Standardized categories for the Finance Tracker app
 * These are used consistently across budget, income and expense screens
 */

export const EXPENSE_CATEGORIES = [
  { id: 'food', name: 'Food', icon: '🍔', color: '#FF6B6B' },
  { id: 'transportation', name: 'Transportation', icon: '🚗', color: '#4ECDC4' },
  { id: 'housing', name: 'Housing', icon: '🏠', color: '#8675A9' },
  { id: 'utilities', name: 'Utilities', icon: '💡', color: '#6A0572' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#FFD166' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#FF9A8B' },
  { id: 'healthcare', name: 'Healthcare', icon: '⚕️', color: '#1A936F' },
  { id: 'education', name: 'Education', icon: '📚', color: '#3D5A80' },
  { id: 'personal', name: 'Personal', icon: '👤', color: '#F9C74F' },
  { id: 'travel', name: 'Travel', icon: '✈️', color: '#90BE6D' },
  { id: 'subscriptions', name: 'Subscriptions', icon: '📱', color: '#F94144' },
  { id: 'gifts', name: 'Gifts', icon: '🎁', color: '#9B5DE5' },
  { id: 'other', name: 'Other', icon: '📋', color: '#758BFD' }
];

export const INCOME_CATEGORIES = [
  { id: 'salary', name: 'Salary', icon: '💼', color: '#2A9D8F' },
  { id: 'freelance', name: 'Freelance', icon: '💻', color: '#E9C46A' },
  { id: 'business', name: 'Business', icon: '🏢', color: '#F4A261' },
  { id: 'investments', name: 'Investments', icon: '📈', color: '#8ECAE6' },
  { id: 'rental', name: 'Rental', icon: '🏘️', color: '#9B5DE5' },
  { id: 'gifts', name: 'Gifts', icon: '🎁', color: '#EF476F' },
  { id: 'refunds', name: 'Refunds', icon: '↩️', color: '#06D6A0' },
  { id: 'other', name: 'Other', icon: '📋', color: '#118AB2' }
];

// This maps expense categories to their respective budget categories
// This is important for tracking spending against budgets
export const CATEGORY_TO_BUDGET_MAP = {
  // Map each expense category to its budget category
  food: 'Food',
  transportation: 'Transportation',
  housing: 'Housing',
  utilities: 'Utilities',
  entertainment: 'Entertainment',
  shopping: 'Shopping',
  healthcare: 'Healthcare',
  education: 'Education',
  personal: 'Personal',
  travel: 'Travel',
  subscriptions: 'Subscriptions',
  gifts: 'Gifts',
  other: 'Other'
};

/**
 * Find a category object by its ID
 * @param {string} categoryId - The ID of the category to find
 * @param {string} type - 'expense' or 'income'
 * @returns {Object} - The category object or a default one
 */
export const getCategoryById = (categoryId, type = 'expense') => {
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return categories.find(cat => cat.id === categoryId) || 
    { id: 'other', name: 'Other', icon: '📋', color: type === 'income' ? '#118AB2' : '#758BFD' };
};

/**
 * Get all categories based on type
 * @param {string} type - 'expense', 'income', or 'all'
 * @returns {Array} - Array of category objects
 */
export const getCategories = (type = 'all') => {
  if (type === 'income') return INCOME_CATEGORIES;
  if (type === 'expense') return EXPENSE_CATEGORIES;
  // If 'all' is specified, return both but mark them with their type
  return [
    ...INCOME_CATEGORIES.map(cat => ({...cat, type: 'income'})),
    ...EXPENSE_CATEGORIES.map(cat => ({...cat, type: 'expense'}))
  ];
};

// Get emoji for given category ID
export const getCategoryEmoji = (categoryId, type = 'expense') => {
  const category = getCategoryById(categoryId, type);
  return category.icon || '📋';
};
