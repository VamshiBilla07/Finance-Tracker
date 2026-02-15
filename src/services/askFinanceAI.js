import '../styles/global/global.css';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Get API key from environment variable
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyCjg7AvKcyQWM-VkC7JXXAoacb6OjE2VS4';

// Check if API key exists
const hasValidApiKey = API_KEY && API_KEY.length > 0;

// Set up Gemini AI with error handling
const genAI = hasValidApiKey ? new GoogleGenerativeAI(API_KEY) : null;

/**
 * Asks a finance-related question to the AI assistant
 * @param {string} question - The finance question to ask
 * @param {Object} [userContext] - Optional contextual data about the user's finances
 * @returns {Promise<string>} - The AI's response
 */
export const askFinanceAI = async (question, userContext = {}) => {
  try {
    // If API key is missing, return a fallback message
    if (!hasValidApiKey) {
      console.warn("Gemini API key is missing. Please add it to your environment variables.");
      return "Sorry, the AI assistant is currently unavailable. Please check your API configuration.";
    }

    // Create a context-enriched prompt
    const enrichedPrompt = createContextualPrompt(question, userContext);
    
    // Set up the model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Configure the generation
    const generationConfig = {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1000,
    };
    
    // Generate the response
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: enrichedPrompt }] }],
      generationConfig,
    });
    
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Error with Gemini API:", error);
    
    // Provide helpful error messages based on error type
    if (error.message?.includes('API_KEY_INVALID')) {
      return "Finance AI is unavailable: Invalid API key. Please contact support.";
    } else if (error.message?.includes('PERMISSION_DENIED')) {
      return "Finance AI is unavailable: API key doesn't have permission. Please contact support.";
    } else {
      return "Sorry, I couldn't process your request at the moment. Please try again later.";
    }
  }
};

/**
 * Creates a contextual prompt with the user's financial information
 */
const createContextualPrompt = (question, userContext) => {
  const context = userContext 
    ? `
      User's financial context:
      - Monthly income: ${userContext.monthlyIncome || 'Not provided'}
      - Monthly expenses: ${userContext.monthlyExpenses || 'Not provided'}
      - Savings: ${userContext.savings || 'Not provided'}
      - Budget concerns: ${userContext.budgetConcerns || 'None specified'}
      
      Based on this context, please provide personalized financial advice.
      `
    : '';
  
  return `
    You are a helpful financial assistant. 
    Provide concise, practical financial advice.
    Focus on actionable tips and explanations.
    ${context}
    
    User's question: ${question}
  `;
};

// Export a fallback function that doesn't require the API
export const getFinanceTip = () => {
  const tips = [
    "Try to save 20% of your monthly income.",
    "Track your expenses daily for better awareness.",
    "Consider automating your savings with scheduled transfers.",
    "Review your subscriptions monthly to avoid unnecessary expenses.",
    "Create an emergency fund with 3-6 months of essential expenses."
  ];
  
  return tips[Math.floor(Math.random() * tips.length)];
};
