import '../styles/global/global.css';
import { supabase, getCurrentUser } from './supabaseClient';

// Save push subscription to Supabase
export const saveSubscription = async (subscription) => {
  try {
    // Check if user is authenticated
    const user = await getCurrentUser();
    
    // Add user_id to subscription data if available
    const subscriptionData = {
      ...subscription,
      user_id: user?.id || null
    };
    
    // Check if subscription with this endpoint already exists
    const { data: existingSubscription, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('id')
      .filter('subscription->endpoint', 'eq', subscription.endpoint)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Error checking existing subscription:', fetchError);
    }
    
    let result;
    
    if (existingSubscription) {
      // Update existing subscription
      const { data, error } = await supabase
        .from('push_subscriptions')
        .update({ subscription: subscriptionData })
        .eq('id', existingSubscription.id);
      
      if (error) throw error;
      result = { success: true, updated: true, data };
    } else {
      // Insert new subscription
      const { data, error } = await supabase
        .from('push_subscriptions')
        .insert({ subscription: subscriptionData });
      
      if (error) throw error;
      result = { success: true, updated: false, data };
    }
    
    return result;
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return { success: false, error: error.message };
  }
};

// Get user's push subscription
export const getUserSubscription = async () => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }
    
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .filter('subscription->user_id', 'eq', user.id)
      .maybeSingle();
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return { success: false, error: error.message };
  }
};

// Delete a push subscription
export const deleteSubscription = async (subscriptionEndpoint) => {
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .delete()
      .filter('subscription->endpoint', 'eq', subscriptionEndpoint);
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return { success: false, error: error.message };
  }
};
