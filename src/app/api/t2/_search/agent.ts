import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Embeddings } from "@langchain/core/embeddings";
import { BaseMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  PromptTemplate,
} from "@langchain/core/prompts";
import { RunnableMap, RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { Document } from "@langchain/core/documents";

import { searchSearxng } from "./search";
import { webSearchRetrieverPrompt, webSearchResponsePrompt } from "./prompt";
import {
  formatChatHistoryAsString,
  getDocumentsFromLinks,
  computeSimilarity,
  parseRetrieverOutput,
  processDocsForContext,
} from "./util";

const RERANK_THRESHOLD = Number(process.env.RERANK_THRESHOLD) || 0.3;
const MAX_CONTEXT_DOCS = Number(process.env.MAX_CONTEXT_DOCS) || 7;

interface SearchAgentResult {
  answer: string;
  sources: Document[];
}

export class Agent {
  private llm: BaseChatModel;
  private retrieverLlm: BaseChatModel;
  private embeddings: Embeddings;
  private strParser = new StringOutputParser();

  constructor(
    llm: BaseChatModel,
    retrieverLlm: BaseChatModel,
    embeddings: Embeddings
  ) {
    this.llm = llm;
    this.retrieverLlm = retrieverLlm;
    this.embeddings = embeddings;
  }

  private async retrieveAndRankDocs(
    query: string,
    history: BaseMessage[]
  ): Promise<{ finalQuery: string | null; rankedDocs: Document[] }> {
    console.log("[Agent] Starting document retrieval and ranking...");
    const historyString = formatChatHistoryAsString(history);

    // 1. Use Retriever LLM to decide if search is needed and rephrase query
    const retrieverChain = PromptTemplate.fromTemplate(webSearchRetrieverPrompt)
      .pipe(this.retrieverLlm)
      .pipe(this.strParser);

    console.log("[Agent] Invoking retriever chain...");
    const retrieverOutput = await retrieverChain.invoke({
      chat_history: historyString,
      query: query,
    });
    console.log(`[Agent] Retriever output: ${retrieverOutput}`);

    const { query: rephrasedQuery, links } =
      parseRetrieverOutput(retrieverOutput);

    if (!rephrasedQuery) {
      console.log("[Agent] Search not needed based on retriever output.");
      return { finalQuery: null, rankedDocs: [] }; // Indicate no search needed
    }

    let initialDocs: Document[] = [];

    // 2. Fetch documents based on links or search query
    if (links.length > 0) {
      console.log(`[Agent] Fetching documents from ${links.length} links...`);
      // Note: Summarization inside getDocumentsFromLinks isn't implemented here
      // It would require another LLM call per document if needed.
      initialDocs = await getDocumentsFromLinks({ links });
    } else if (rephrasedQuery) {
      console.log(`[Agent] Performing web search for: "${rephrasedQuery}"`);
      const searchResults = await searchSearxng(rephrasedQuery);
      initialDocs = searchResults.results
        .filter((r) => r.content || r.title) // Filter out results with no content/title
        .map(
          (r) =>
            new Document({
              pageContent: r.content || r.title || "", // Use title as fallback content
              metadata: { title: r.title, url: r.url },
            })
        );
      console.log(
        `[Agent] Found ${initialDocs.length} initial search results.`
      );
    }

    // 3. Rerank documents
    const docsWithContent = initialDocs.filter(
      (doc) => doc.pageContent && doc.pageContent.length > 10
    ); // Ensure some content
    if (docsWithContent.length === 0) {
      console.log(
        "[Agent] No documents with sufficient content found for ranking."
      );
      return { finalQuery: rephrasedQuery, rankedDocs: [] };
    }
    console.log(`[Agent] Reranking ${docsWithContent.length} documents...`);

    try {
      const [docEmbeddings, queryEmbedding] = await Promise.all([
        this.embeddings.embedDocuments(
          docsWithContent.map((doc) => doc.pageContent)
        ),
        this.embeddings.embedQuery(rephrasedQuery),
      ]);

      if (
        !queryEmbedding ||
        !docEmbeddings ||
        docEmbeddings.length !== docsWithContent.length
      ) {
        console.error("[Agent] Failed to generate embeddings for ranking.");
        return {
          finalQuery: rephrasedQuery,
          rankedDocs: docsWithContent.slice(0, MAX_CONTEXT_DOCS),
        }; // Fallback: return top unfiltered docs
      }

      const similarityScores = docEmbeddings.map((docEmbedding, i) => ({
        index: i,
        similarity: computeSimilarity(queryEmbedding, docEmbedding),
      }));

      const rankedDocs = similarityScores
        .filter((score) => score.similarity > RERANK_THRESHOLD)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, MAX_CONTEXT_DOCS)
        .map((score) => docsWithContent[score.index]);

      console.log(
        `[Agent] Reranked - selected ${rankedDocs.length} documents.`
      );
      return { finalQuery: rephrasedQuery, rankedDocs };
    } catch (embeddingError: any) {
      console.error(
        "[Agent] Error during embedding/ranking:",
        embeddingError.message
      );
      // Fallback to returning top unfiltered docs if ranking fails
      return {
        finalQuery: rephrasedQuery,
        rankedDocs: docsWithContent.slice(0, MAX_CONTEXT_DOCS),
      };
    }
  }

  public async processQuery(
    userQuery: string,
    history: BaseMessage[] = [],
    systemInstructions: string = "Be helpful."
  ): Promise<SearchAgentResult> {
    console.log(`[Agent] Processing query: "${userQuery}"`);

    const { finalQuery, rankedDocs } = await this.retrieveAndRankDocs(
      userQuery,
      history
    );

    // If retriever decided no search/answer needed, or if search failed entirely
    if (finalQuery === null) {
      console.log(
        "[Agent] No search needed or retrieval failed, invoking LLM directly."
      );
      // Invoke LLM without search context, only history and user query
      const directPrompt = ChatPromptTemplate.fromMessages([
        [
          "system",
          "You are a helpful AI assistant. Respond directly to the user's query based on the conversation history. {systemInstructions}\nCurrent date: {date}",
        ],
        new MessagesPlaceholder("chat_history"),
        ["human", "{query}"],
      ]);
      const directChain = directPrompt.pipe(this.llm).pipe(this.strParser);
      const answer = await directChain.invoke({
        systemInstructions: systemInstructions,
        chat_history: history,
        query: userQuery,
        date: new Date().toISOString(),
      });
      return {
        answer: answer || "I cannot proceed with this request.",
        sources: [],
      };
    }

    // Prepare context for the final LLM
    const contextString = processDocsForContext(rankedDocs);
    // console.log(`[Agent] Context for LLM:\n---\n${contextString}\n---`); // Log context for debugging

    // 4. Generate the final response using the main LLM
    const answerChain = RunnableSequence.from([
      RunnableMap.from({
        systemInstructions: (input: {
          systemInstructions: string;
          query: string;
          chat_history: BaseMessage[];
        }) => input.systemInstructions,
        query: (input: {
          systemInstructions: string;
          query: string;
          chat_history: BaseMessage[];
        }) => input.query,
        chat_history: (input: {
          systemInstructions: string;
          query: string;
          chat_history: BaseMessage[];
        }) => input.chat_history,
        date: () => new Date().toISOString(),
        context: () => contextString, // Use the processed context
      }),
      ChatPromptTemplate.fromMessages([
        ["system", webSearchResponsePrompt], // Use the detailed response prompt
        new MessagesPlaceholder("chat_history"),
        ["user", "{query}"],
      ]),
      this.llm,
      this.strParser,
    ]);

    console.log("[Agent] Invoking final answer chain...");
    try {
      const finalAnswer = await answerChain.invoke({
        query: finalQuery, // Use the potentially rephrased query
        chat_history: history,
        systemInstructions: systemInstructions,
      });
      console.log("[Agent] Received final answer.");

      return {
        answer:
          finalAnswer ||
          "I couldn't generate a response based on the search results.",
        sources: rankedDocs, // Return the documents used as context
      };
    } catch (error: any) {
      console.error("[Agent] Error generating final answer:", error.message);
      return {
        answer:
          "Sorry, I encountered an error while generating the final response.",
        sources: rankedDocs, // Still return sources found, if any
      };
    }
  }
}
