import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Embeddings } from "@langchain/core/embeddings";
export const getGeminiChatModel = (
  modelName = "gemini-2.0-flash",
  temperature = 0.7,
): BaseChatModel => {
  const apiKey = process.env.GOOGLE_AI_KEY;

  return new ChatGoogleGenerativeAI({
    apiKey: apiKey,
    model: modelName,
    temperature: temperature,
    streaming: false,
  });
};

export const getGeminiEmbeddingModel = (
  modelName = "models/text-embedding-004",
): Embeddings => {
  const apiKey = process.env.GOOGLE_AI_KEY;
  return new GoogleGenerativeAIEmbeddings({
    apiKey: apiKey,
    model: modelName,
  });
};
