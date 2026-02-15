import { useEffect, useRef } from 'react';
import { usePointsSystem } from './usePointsSystem';

export const useMonthEndChecker = () => {
  const { checkMonthEndBonus } = usePointsSystem();
  const lastCheckedMonth = useRef(new Date().getMonth());
  
  useEffect(() => {
    // Check if we've moved to a new month
    const checkForMonthEnd = () => {
      const currentMonth = new Date().getMonth();
      
      // If the month has changed since we last checked
      if (currentMonth !== lastCheckedMonth.current) {
        // Run month end bonus check
        checkMonthEndBonus();
        // Update the last checked month
        lastCheckedMonth.current = currentMonth;
      }
    };
    
    // Check immediately when the app loads
    checkForMonthEnd();
    
    // Then set up an interval to check daily
    const intervalId = setInterval(checkForMonthEnd, 24 * 60 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [checkMonthEndBonus]);
};
