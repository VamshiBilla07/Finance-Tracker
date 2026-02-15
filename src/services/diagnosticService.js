import '../styles/global/global.css';
import { supabase } from './supabaseClient';

/**
 * Utility to diagnose database connection issues
 */
export const checkDatabaseConnection = async () => {
  try {
    // Simple health check
    const { data, error } = await supabase.from('_database_health').select('*').limit(1).maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      // PGRST116 just means no rows found, which is fine
      console.error('Database connection error:', error);
      return {
        connected: false,
        error: error.message
      };
    }
    
    return { connected: true };
  } catch (error) {
    console.error('Failed to check database connection:', error);
    return {
      connected: false,
      error: error.message
    };
  }
};

/**
 * Diagnose table issues
 */
export const diagnoseTable = async (tableName) => {
  try {
    console.log(`Diagnosing table: ${tableName}`);
    
    // 1. Check if table exists
    const { data: tableExists, error: tableError } = await supabase
      .from(tableName)
      .select('count(*)')
      .limit(1)
      .single();
    
    if (tableError && tableError.code !== 'PGRST116') {
      console.error(`Table check error for ${tableName}:`, tableError);
      return {
        exists: false,
        error: tableError.message,
        rowCount: 0,
        sample: null
      };
    }
    
    // 2. Check row count
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    // 3. Get sample data
    const { data: sample, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    const result = {
      exists: true,
      rowCount: count || 0,
      sample: sample?.[0] || null
    };
    
    console.log(`Diagnosis result for ${tableName}:`, result);
    return result;
  } catch (error) {
    console.error(`Failed to diagnose table ${tableName}:`, error);
    return {
      exists: false,
      error: error.message,
      rowCount: 0,
      sample: null
    };
  }
};

/**
 * Run a complete diagnostic
 */
export const runSystemDiagnostic = async () => {
  const results = {};
  
  // Check connection
  results.connection = await checkDatabaseConnection();
  
  // Check important tables
  const tables = ['balances', 'transactions', 'budgets', 'savings_points'];
  
  for (const table of tables) {
    results[table] = await diagnoseTable(table);
  }
  
  console.log('System diagnostic results:', results);
  return results;
};
