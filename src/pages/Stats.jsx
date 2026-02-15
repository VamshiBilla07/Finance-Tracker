import React from 'react';
import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie, Line, Bar } from 'react-chartjs-2';
import '../styles/global/global.css';
import '../styles/pages/Dashboard.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

const Stats = () => {
  const [transactions] = useState([
    { type: 'income', category: 'Salary', amount: 3000, date: '2025-04-01' },
    { type: 'expense', category: 'Groceries', amount: 500, date: '2025-04-02' },
    { type: 'expense', category: 'Rent', amount: 1000, date: '2025-04-03' },
    { type: 'income', category: 'Freelance', amount: 1500, date: '2025-04-04' },
    { type: 'expense', category: 'Utilities', amount: 200, date: '2025-04-05' },
  ]);

  const pieData = {
    labels: ['Groceries', 'Rent', 'Utilities'],
    datasets: [
      {
        data: [500, 1000, 200],
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
        hoverBackgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
      },
    ],
  };

  const lineData = {
    labels: ['April 1', 'April 2', 'April 3', 'April 4', 'April 5'],
    datasets: [
      {
        label: 'Balance Over Time',
        data: [3000, 2500, 1500, 3000, 2800],
        fill: false,
        borderColor: '#4BC0C0',
      },
    ],
  };

  const barData = {
    labels: ['Income', 'Expense'],
    datasets: [
      {
        label: 'Monthly Totals',
        data: [4500, 1700],
        backgroundColor: ['#4BC0C0', '#FF6384'],
      },
    ],
  };

  return (
    <div className="stats-page">
      <h1>Stats</h1>

      <div className="chart-container">
        <div className="chart">
          <h2>Category-wise Expense</h2>
          <Pie data={pieData} />
        </div>

        <div className="chart">
          <h2>Balance Over Time</h2>
          <Line data={lineData} />
        </div>

        <div className="chart">
          <h2>Monthly Totals</h2>
          <Bar data={barData} />
        </div>
      </div>
    </div>
  );
};

export default Stats;