import React, { createContext, useState, useContext, useEffect } from 'react';
import '../styles/global/global.css';

const CurrencyContext = createContext();

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState('INR');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [dateFormat, setDateFormat] = useState('dd/MM/yyyy');
  
  // Load saved preferences from localStorage on initialization
  useEffect(() => {
    const savedCurrency = localStorage.getItem('currency') || 'INR';
    const savedDateFormat = localStorage.getItem('dateFormat') || 'dd/MM/yyyy';
    
    setCurrency(savedCurrency);
    setDateFormat(savedDateFormat);
    
    // Set the symbol based on currency
    switch(savedCurrency) {
      case 'USD':
        setCurrencySymbol('$');
        break;
      case 'EUR':
        setCurrencySymbol('€');
        break;
      case 'GBP':
        setCurrencySymbol('£');
        break;
      case 'JPY':
        setCurrencySymbol('¥');
        break;
      case 'INR':
      default:
        setCurrencySymbol('₹');
        break;
    }
  }, []);
  
  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('currency', currency);
    localStorage.setItem('dateFormat', dateFormat);
  }, [currency, dateFormat]);
  
  // Format amount according to selected currency
  const formatAmount = (amount) => {
    if (amount === undefined || amount === null) return `${currencySymbol}0.00`;
    
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };
  
  // Format date according to selected format
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    switch(dateFormat) {
      case 'MM/dd/yyyy':
        return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
      case 'yyyy-MM-dd':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      case 'dd/MM/yyyy':
      default:
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    }
  };
  
  // Parse date string to ISO format based on the current date format
  const parseDate = (dateString) => {
    if (!dateString) return null;
    
    let day, month, year;
    
    switch(dateFormat) {
      case 'MM/dd/yyyy': {
        const [monthStr, dayStr, yearStr] = dateString.split('/');
        day = parseInt(dayStr, 10);
        month = parseInt(monthStr, 10) - 1; // Months are 0-indexed in JS Date
        year = parseInt(yearStr, 10);
        break;
      }
      case 'yyyy-MM-dd': {
        const [yearStr, monthStr, dayStr] = dateString.split('-');
        day = parseInt(dayStr, 10);
        month = parseInt(monthStr, 10) - 1;
        year = parseInt(yearStr, 10);
        break;
      }
      case 'dd/MM/yyyy':
      default: {
        const [dayStr, monthStr, yearStr] = dateString.split('/');
        day = parseInt(dayStr, 10);
        month = parseInt(monthStr, 10) - 1;
        year = parseInt(yearStr, 10);
        break;
      }
    }
    
    const date = new Date(year, month, day);
    return date.toISOString();
  };
  
  // Get date format for input elements
  const getInputDateFormat = () => {
    switch(dateFormat) {
      case 'MM/dd/yyyy': return 'mm/dd/yyyy';
      case 'yyyy-MM-dd': return 'yyyy-mm-dd';
      case 'dd/MM/yyyy': default: return 'dd/mm/yyyy';
    }
  };
  
  const value = {
    currency,
    setCurrency,
    currencySymbol,
    dateFormat,
    setDateFormat,
    formatAmount,
    formatDate,
    parseDate,
    getInputDateFormat
  };
  
  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
