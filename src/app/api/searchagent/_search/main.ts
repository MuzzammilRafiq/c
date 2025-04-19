import chalk from "chalk";
import { getGeminiChatModel, getGeminiEmbeddingModel } from "./providers";
import { Agent } from "./agent";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { RequestBody } from "./types";
export async function main({
  model,
  query,
  history,
  systemInstructions,
}: RequestBody): Promise<{ data?: any; sucess: boolean; message?: string }> {
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

  const langChainHistory: BaseMessage[] = (history || []).map((message) => {
    if (message.role === "user") {
      return new HumanMessage(message.content);
    } else {
      return new AIMessage(message.content);
    }
  });

  if (langChainHistory.length > 0) {
    console.log(
      "Processing with history:",
      langChainHistory
        .map((m) => {
          const content = m.content;
          const preview =
            typeof content === "string"
              ? content.substring(0, 50)
              : JSON.stringify(content).substring(0, 50); // Handle potential non-string content if BaseMessage allows
          return `${m._getType()}: ${preview}...`;
        })
        .join("\n")
    );
  }
  if (systemInstructions) {
    console.log("Processing with system instructions:", systemInstructions);
  }

  try {
    const result = await agent.processQuery(
      userQuery,
      langChainHistory,
      systemInstructions || "Be helpful."
    );

    return { data: result, sucess: true };
  } catch (error: any) {
    console.error("\n--- An error occurred during agent processing ---");
    console.error(error.message);
    console.error(error.stack);
    return {
      message: "Something went wrong while the agent was processing the query.",
      sucess: false,
    };
  }
}
