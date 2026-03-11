import '../../styles/global/global.css';
import { askFinanceAI } from './askFinanceAI';

// A simple test function to check if the API connection works
export async function testGeminiConnection() {
  try {
    console.log('Testing Gemini API connection...');
    // Use import.meta.env instead of process.env for Vite
    console.log('API Key available:', Boolean(import.meta.env.VITE_GEMINI_API_KEY));
    
    const response = await askFinanceAI('Test connection with a simple finance tip.');
    console.log('API Response:', response);
    
    return {
      success: true,
      response: response
    };
  } catch (error) {
    console.error('API Connection Test Failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}
