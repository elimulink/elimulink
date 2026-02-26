import { apiPost } from "../lib/apiClient";

async function postStudentAI(text, { idToken = null } = {}) {
  const data = await apiPost('/api/ai/student', { message: text, text }, { token: idToken });
  return data?.text || '';
}

export const geminiAPI = {
  searchBook: async function(query, options = {}) {
    try {
      const text = await postStudentAI(query, options);
      return { found: true, message: text };
    } catch (error) {
      console.error('geminiAPI.searchBook error:', error.message || error);
      return { found: false, message: 'Error connecting to AI service.' };
    }
  },

  askQuestion: async function(question, options = {}) {
    try {
      return await postStudentAI(question, options);
    } catch (error) {
      console.error('geminiAPI.askQuestion error:', error.message || error);
      return 'Sorry, I could not process your request.';
    }
  }
};

export default geminiAPI;
