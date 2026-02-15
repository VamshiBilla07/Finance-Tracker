import { lazy, Suspense, useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { AuthProvider } from './context/AuthContext'; 
import FloatingNav from './components/FloatingNav';
import AIAssistant from './components/AIAssistant';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import LoadingScreen from './components/LoadingScreen';
import Notifications from './components/Notifications';
import { supabase } from './services/supabaseClient';
import './styles/variables.css'; 
import './styles/global/global.css'; 
import './styles/App.css';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SetupBalances = lazy(() => import('./pages/SetupBalances'));
const AddIncome = lazy(() => import('./pages/AddIncome'));
const AddExpense = lazy(() => import('./pages/AddExpense'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));
const PointsPage = lazy(() => import('./pages/PointsPage'));
const BudgetManagement = lazy(() => import('./pages/BudgetManagement'));

function App() {
  // State for offline detection
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Effect to check online status
  useEffect(() => {
    // Update network status
    const handleStatusChange = () => {
      setIsOnline(navigator.onLine);
    };

    // Listen to the online status
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    return () => {
      // Cleanup
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  // Effect to load user data
  useEffect(() => {
    async function getUserData() {
      try {
        setLoading(true);
        
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const { user } = session;
          
          // Get user profile data
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (error) {
            console.error('Error fetching user profile:', error);
          } else {
            // Update user data in state
            setUserData({
              ...user,
              profile: data
            });
          }
        }
      } catch (error) {
        console.error('Error getting user data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    getUserData();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserData(session.user);
      } else {
        setUserData(null);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ThemeProvider>
      <CurrencyProvider>
        <AuthProvider>
          {!isOnline && (
            <div className="offline-indicator">
              You are currently offline. Some features may be limited.
            </div>
          )}
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/balances" element={<SetupBalances />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/add-income" element={<AddIncome />} />
              <Route path="/add-expense" element={<AddExpense />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/points" element={<PointsPage />} />
              <Route path="/budgets" element={<BudgetManagement />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Notifications />
            <AIAssistant userData={userData} />
            <FloatingNav />
          </Suspense>
          <Toaster position="top-right" />
        </AuthProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}

export default App;
