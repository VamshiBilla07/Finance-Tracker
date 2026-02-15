import React from 'react';
import '../styles/global/global.css';
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  // Added error handling for missing context
  if (context === undefined) {
    console.error("useAuth must be used within an AuthProvider");
    // Return fallback data to prevent destructuring errors
    return { 
      user: null,
      loading: false,
      accounts: [],
      setAccounts: () => {} 
    };
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false); // Changed to false to prevent blocking UI
  const [accounts, setAccounts] = useState([
    { id: 1, name: 'Piggy Bank', icon: '💰', balance: 305.00, type: 'savings' },
    { id: 2, name: 'Wallet', icon: '👛', balance: 232.00, type: 'cash' },
    { id: 3, name: 'Gpay', icon: '📱', balance: 11636.08, type: 'digital' }
  ]);

  // Auth functions would go here

  const value = {
    user,
    loading,
    accounts,
    setAccounts
  };

  return (
    <AuthContext.Provider value={value}>
      {children} {/* Removed condition to always render children */}
    </AuthContext.Provider>
  );
}
