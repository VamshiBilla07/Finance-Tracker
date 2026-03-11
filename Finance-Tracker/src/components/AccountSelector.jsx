import React, { useState } from 'react';
import '../styles/global/global.css';
import { useAuth } from '../context/AuthContext';

const AccountSelector = ({ onSelect, selectedAccountId }) => {
  const { accounts } = useAuth();
  
  const handleAccountSelect = (accountId) => {
    onSelect(accountId);
  };

  return (
    <div className="account-selector">
      <h3 className="text-lg font-medium mb-3">Select Account</h3>
      <div className="space-y-2">
        {accounts.map((account) => (
          <div 
            key={account.id}
            onClick={() => handleAccountSelect(account.id)}
            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
              selectedAccountId === account.id ? 'bg-green-100 border border-green-500' : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{account.icon}</span>
              <span className="font-medium">{account.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium">₹{account.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              {selectedAccountId === account.id && <span className="text-green-500 text-xl">✓</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccountSelector;
