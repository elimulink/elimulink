import { apiPost } from "../lib/apiClient";

const imageAPI = {
  generateImage: async (prompt, { idToken = null, compare = false } = {}) => {
    const data = await apiPost(
      '/api/ai/image',
      { prompt, message: prompt, text: prompt, compare: !!compare, comparison: !!compare },
      { token: idToken }
    );
    if (!data?.image) throw new Error(data?.error || 'Image generation failed');
    return {
      image: data.image,
      images: Array.isArray(data.images) ? data.images : [],
      comparison: !!data.comparison,
      text: data.text || 'Here is your generated image.',
      provider: data.provider || data?.data?.provider || '',
      model: data.model || data?.data?.model || '',
    };
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
      text: data.text || 'Here is the updated image.',
      provider: data.provider || data?.data?.provider || '',
      model: data.model || data?.data?.model || '',
    };
  },
  getLatestImageFromMessages: (messages = []) => {
    const items = Array.isArray(messages) ? messages : [];
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const message = items[index] || {};
      const imageUrl =
        message.selectedImageUrl ||
        message.imageUrl ||
        (message.type === "image" ? message.content : "");
      if (typeof imageUrl === "string" && imageUrl.trim()) return imageUrl;
    }
    return "";
  },
};

export default imageAPI;
