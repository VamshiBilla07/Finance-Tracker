import '../../styles/global/global.css';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Get API key from environment variable
// Note: In Vite, environment variables must start with VITE_ to be exposed
const apiKey = process.env.VITE_GEMINI_API_KEY || 'AIzaSyAq8W81XFjsaHpKTZY3fm0puhdldfYuxeA';
const genAI = new GoogleGenerativeAI(apiKey);

export async function askFinanceAI(prompt) {
  // Add error handling for missing API key
  if (!apiKey) {
    console.error('Gemini API key is missing. Check your environment variables.');
    return "I'm having trouble connecting to the finance assistant right now. API key not found.";
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const systemPrompt = `
    You are a specialized Finance AI Assistant.
    Strictly respond only about:
    - Personal finance
    - Spending habits
    - Budgeting
    - Saving tips
    - Investments (safe & beginner-friendly)
    - Income vs expense analysis
    - Financial planning advice

    Never answer anything outside finance.  
    Politely refuse if the user asks unrelated questions.

    Example goals:
    - Help users save more money
    - Reduce unnecessary expenses
    - Improve their financial habits
    - Motivate financial growth

    Keep responses concise, practical, and actionable.
    Use Indian Rupee (₹) as the default currency in examples.
  `;

  try {
    // Correct API usage based on latest Gemini SDK
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: systemPrompt + '\n\n' + prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      }
    });

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error with Gemini API:', error);
    return "I'm having trouble connecting to the finance assistant right now. Please try again later.";
  }
}

// Generate personalized finance insights based on user data
export async function generateFinanceInsights(userData) {
  const { income, expenses, savings, categories } = userData;
  
  // Get top spending categories
  const topCategories = Object.entries(categories || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name, amount]) => `${name}: ₹${amount}`);
  
  const prompt = `
    User financial details:
    - Monthly income: ₹${income}
    - Monthly expenses: ₹${expenses}
    - Monthly savings: ₹${savings}
    - Top spending categories: ${topCategories.join(', ')}
    
    Based on this data, provide 2-3 concise, personalized financial insights and actionable tips to improve their financial health.
    Keep each insight under 2 sentences. Focus on practical advice.
  `;
  
  return askFinanceAI(prompt);
}

// Generate notification content for financial reminders
export async function generateFinanceNotification(type) {
  const promptMap = {
    dailyTracking: "Create a short, engaging notification (under 100 characters) to encourage the user to track their daily expenses.",
    savingReminder: "Generate a brief, motivational notification (under 100 characters) reminding the user to set aside money for savings today.",
    budgetAlert: "Write a friendly but effective notification (under 100 characters) alerting the user that they're close to exceeding their monthly budget.",
    investmentTip: "Create a short notification (under 100 characters) with a simple investment tip for beginners."
  };
  
  const prompt = promptMap[type] || promptMap.dailyTracking;
  return askFinanceAI(prompt);
}
