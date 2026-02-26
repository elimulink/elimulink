import { apiPost } from "../lib/apiClient";

const imageAPI = {
  generateImage: async (prompt, { idToken = null } = {}) => {
    const data = await apiPost('/api/ai/image', { prompt, message: prompt, text: prompt }, { token: idToken });
    if (!data?.image) throw new Error(data?.error || 'Image generation failed');
    return data.image;
  }
};

export default imageAPI;
