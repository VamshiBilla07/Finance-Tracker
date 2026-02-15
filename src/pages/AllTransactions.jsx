import '../styles/global/global.css';
import React from 'react';
import { useState } from 'react';
import '../styles/pages/TransactionForm.css';

const initialTransactions = [
  { id: 1, type: 'income', balanceType: 'GPay', amount: 500, date: '2025-04-20', note: 'Freelance work' },
  { id: 2, type: 'expense', balanceType: 'Wallet', amount: 200, date: '2025-04-21', note: 'Groceries' },
  { id: 3, type: 'income', balanceType: 'Piggy Bank', amount: 300, date: '2025-04-22', note: 'Gift' },
];

const AllTransactions = () => {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [filters, setFilters] = useState({ type: '', balanceType: '', dateRange: { start: '', end: '' } });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesType = filters.type ? transaction.type === filters.type : true;
    const matchesBalanceType = filters.balanceType ? transaction.balanceType === filters.balanceType : true;
    const matchesDateRange =
      filters.dateRange.start && filters.dateRange.end
        ? new Date(transaction.date) >= new Date(filters.dateRange.start) &&
          new Date(transaction.date) <= new Date(filters.dateRange.end)
        : true;
    return matchesType && matchesBalanceType && matchesDateRange;
  });

  const handleDelete = (id) => {
    setTransactions((prev) => prev.filter((transaction) => transaction.id !== id));
  };

  return (
    <div className="transactions-page">
      <h1>All Transactions</h1>

      <div className="filters">
        <select name="type" value={filters.type} onChange={handleFilterChange}>
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <select name="balanceType" value={filters.balanceType} onChange={handleFilterChange}>
          <option value="">All Balances</option>
          <option value="GPay">GPay</option>
          <option value="Wallet">Wallet</option>
          <option value="Piggy Bank">Piggy Bank</option>
        </select>

        <input
          type="date"
          name="dateRange.start"
          value={filters.dateRange.start}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, dateRange: { ...prev.dateRange, start: e.target.value } }))
          }
        />
        <input
          type="date"
          name="dateRange.end"
          value={filters.dateRange.end}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, dateRange: { ...prev.dateRange, end: e.target.value } }))
          }
        />
      </div>

      <table className="transactions-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Balance Type</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Note</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredTransactions.map((transaction) => (
            <tr key={transaction.id}>
              <td>{transaction.type}</td>
              <td>{transaction.balanceType}</td>
              <td>${transaction.amount}</td>
              <td>{transaction.date}</td>
              <td>{transaction.note}</td>
              <td>
                <button onClick={() => handleDelete(transaction.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AllTransactions;