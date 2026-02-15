import '../styles/global/global.css';

/**
 * Returns an appropriate emoji for a transaction category
 * @param {string} category The transaction category
 * @param {string} type The transaction type (income/expense)
 * @returns {string} An emoji representing the category
 */
export const getCategoryEmoji = (category, type) => {
  if (!category) return type === 'income' ? '💰' : '🛍️';
  
  const categoryLower = category.toLowerCase();
  
  // Income categories
  if (type === 'income') {
    if (categoryLower.includes('salary')) return '💼';
    if (categoryLower.includes('gift')) return '🎁';
    if (categoryLower.includes('cashback')) return '💸';
    if (categoryLower.includes('freelance')) return '💻';
    if (categoryLower.includes('investment')) return '📈';
    return '💰';
  }
  
  // Expense categories
  if (categoryLower.includes('food') || categoryLower.includes('groceries')) return '🍔';
  if (categoryLower.includes('transport') || categoryLower.includes('travel')) return '🚕';
  if (categoryLower.includes('shopping')) return '🛍️';
  if (categoryLower.includes('entertainment')) return '🎬';
  if (categoryLower.includes('bills') || categoryLower.includes('utilities')) return '📱';
  if (categoryLower.includes('health') || categoryLower.includes('medical')) return '⚕️';
  if (categoryLower.includes('education')) return '📚';
  if (categoryLower.includes('housing') || categoryLower.includes('rent')) return '🏠';
  if (categoryLower.includes('investment')) return '📊';
  
  // Default
  return type === 'income' ? '💰' : '🛍️';
};
