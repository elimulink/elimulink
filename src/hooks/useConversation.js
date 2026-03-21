import { useCallback, useState } from "react";
import {
  createConversation,
  createConversationMessage,
  fetchConversation,
} from "../lib/researchApi";

export function useConversation({ family, app, title }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const startConversation = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await createConversation({ family, app, title });
      setConversation(res.conversation);
      setMessages([]);
      return res.conversation;
    } catch (err) {
      setError(err.message || "Failed to create conversation");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [family, app, title]);

  const loadConversation = useCallback(async (conversationId) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchConversation(conversationId);
      setConversation(res.conversation);
      setMessages(res.messages || []);
      return res;
    } catch (err) {
      setError(err.message || "Failed to load conversation");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (content) => {
      let activeConversation = conversation;

      if (!activeConversation) {
        activeConversation = await startConversation();
      }

      setSending(true);
      setError("");

      try {
        const res = await createConversationMessage(activeConversation.id, content);
        setMessages((prev) => [...prev, res.user_message, res.assistant_message]);
        return res;
      } catch (err) {
        setError(err.message || "Failed to send message");
        throw err;
      } finally {
        setSending(false);
      }
    },
    [conversation, startConversation]
  );

  return {
    conversation,
    messages,
    loading,
    sending,
    error,
    startConversation,
    loadConversation,
    sendMessage,
  };
}
