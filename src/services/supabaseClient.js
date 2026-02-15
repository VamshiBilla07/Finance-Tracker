import '../styles/global/global.css';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Default user configuration for single-user mode
export const DEFAULT_USER = {
  id: 'default-user',
  name: 'User',
  email: 'user@example.com'
};

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Override auth functions for single-user mode
const originalGetUser = supabase.auth.getUser;
supabase.auth.getUser = async () => {
  // In production, you'd use:
  // return await originalGetUser();
  
  // For single-user mode, always return the default user
  return {
    data: {
      user: DEFAULT_USER
    },
    error: null
  };
};

// Check database connection and log result
const checkDatabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Database connection failed:', error);
    } else {
      console.log('Database connection successful (transactions table)');
    }
  } catch (error) {
    console.error('Database connection check error:', error);
  }
};

// Run the connection check
checkDatabaseConnection();

export default supabase;
