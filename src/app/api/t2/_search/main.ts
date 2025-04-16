import chalk from "chalk";
import { getGeminiChatModel, getGeminiEmbeddingModel } from "./providers";
import { Agent } from "./agent";
import { BaseMessage } from "@langchain/core/messages";

async function main({ model, query }: { model: string; query: string }) {
  let llm;
  let retrieverllm;
  let embeddings;

  try {
    // Use a potentially faster/cheaper model for retrieval/rephrasing if desired
    retrieverllm = getGeminiChatModel("gemini-2.0-flash-lite");
    llm = getGeminiChatModel(model);
    embeddings = getGeminiEmbeddingModel("models/text-embedding-004");
    console.log(chalk.green("Models initialized successfully"));
  } catch (error) {
    console.error("Error initializing models:", error);
    throw new Error("Failed to initialize models");
  }
  const agent = new Agent(llm, retrieverllm, embeddings);
  const userQuery = query;
  const chatHistory: BaseMessage[] = [];
  const systemInstructions = "Provide a concise summary in bullet points.";

  if (chatHistory.length > 0) {
    console.log(
      "With history:",
      chatHistory
        .map((m) => `${m._getType()}: ${m.content.substring(0, 50)}...`)
        .join("\n")
    );
  }
  if (systemInstructions) {
    console.log("With system instructions:", systemInstructions);
  }
  try {
    const result = await agent.processQuery(
      userQuery,
      chatHistory,
      systemInstructions
    );

    return result;
  } catch (error: any) {
    console.error("\n--- An error occurred during processing ---");
    console.error(error.message);
  }
}
