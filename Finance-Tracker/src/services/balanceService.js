import '../styles/global/global.css';
import { 
  getBalances, 
  createBalance as createBalanceDb, 
  updateBalance as updateBalanceDb,
  deleteBalance as deleteBalanceDb
} from './databaseService';

// Get all balances
export const getAllBalances = async () => {
  return await getBalances();
};

// Create a new balance
export const createBalance = async (balanceData) => {
  return await createBalanceDb(balanceData);
};

// Update an existing balance
export const updateBalance = async (id, balanceData) => {
  return await updateBalanceDb(id, balanceData);
};

// Delete a balance
export const deleteBalance = async (id) => {
  return await deleteBalanceDb(id);
};

// Calculate total balance
export const calculateTotalBalance = async () => {
  try {
    const balances = await getAllBalances();
    const total = balances.reduce((sum, account) => sum + parseFloat(account.balance || 0), 0);
    return total;
  } catch (error) {
    console.error("Error calculating total balance:", error);
    return 0;
  }
};

// Get balance types
export const getBalanceTypes = async () => {
  return ["Cash", "Bank Account", "Credit Card", "Investment", "Digital Wallet", "Other"];
};
