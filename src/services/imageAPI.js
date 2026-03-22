import { apiPost } from "../lib/apiClient";

const imageAPI = {
  generateImage: async (prompt, { idToken = null } = {}) => {
    const data = await apiPost('/api/ai/image', { prompt, message: prompt, text: prompt }, { token: idToken });
    if (!data?.image) throw new Error(data?.error || 'Image generation failed');
    return data.image;
  },
  editImage: async ({ imageDataUrl, prompt, idToken = null }) => {
    const data = await apiPost(
      '/api/ai/image/edit',
      { image_data_url: imageDataUrl, prompt, message: prompt, text: prompt },
      { token: idToken }
    );
    if (!data?.image) throw new Error(data?.error || 'Image editing failed');
    return {
      image: data.image,
      text: data.text || 'Here is the edited image.',
      provider: data.provider || data?.data?.provider || '',
      model: data.model || data?.data?.model || '',
    };
  }
};

export default imageAPI;
