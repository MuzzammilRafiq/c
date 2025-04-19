import { BaseMessage } from "@langchain/core/messages";
import { Document } from "@langchain/core/documents";
import axios from "axios";
import { htmlToText } from "html-to-text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

import cosineSimilarity from "compute-cosine-similarity";

export const formatChatHistoryAsString = (history: BaseMessage[]): string => {
  return history
    .map((message) => `${message._getType()}: ${message.content}`)
    .join("\n");
};

export const computeSimilarity = (x: number[], y: number[]): number => {
  try {
    const normX = Math.sqrt(x.reduce((sum, val) => sum + val * val, 0));
    const normY = Math.sqrt(y.reduce((sum, val) => sum + val * val, 0));
    if (normX === 0 || normY === 0) return 0;
    return cosineSimilarity(x, y) ?? 0;
  } catch (e) {
    console.error("Error computing similarity:", e);
    return 0;
  }
};

export const parseRetrieverOutput = (
  output: string,
): { query: string | null; links: string[] } => {
  output = output.trim();
  let query: string | null = null;
  let links: string[] = [];

  // because we prompted the model to return a specific format, we can parse the output
  const questionMatch = output.match(/<question>([\s\S]*?)<\/question>/);
  if (questionMatch && questionMatch[1]) {
    query = questionMatch[1].trim();
  }

  const linksMatch = output.match(/<links>([\s\S]*?)<\/links>/);
  if (linksMatch && linksMatch[1]) {
    links = linksMatch[1]
      .trim()
      .split("\n")
      .map((link) => link.trim())
      .filter((link) => link.length > 0);
  }

  if (!questionMatch && !linksMatch && output.toLowerCase() !== "not_needed") {
    query = output;
  }

  if (query?.toLowerCase() === "not_needed") {
    query = null;
  }

  return { query, links };
};

export const processDocsForContext = (docs: Document[]): string => {
  if (!docs || docs.length === 0) {
    return "No context available.";
  }
  return docs
    .map(
      (doc, index) =>
        `[${index + 1}] Source Title: ${
          doc.metadata.title || "N/A"
        }\nSource URL: ${doc.metadata.url || "N/A"}\nContent:\n${
          doc.pageContent
        }`,
    )
    .join("\n\n---\n\n");
};

export const getDocumentsFromLinks = async ({ links }: { links: string[] }) => {
  const splitter = new RecursiveCharacterTextSplitter();

  let docs: Document[] = [];

  await Promise.all(
    links.map(async (link) => {
      link =
        link.startsWith("http://") || link.startsWith("https://")
          ? link
          : `https://${link}`;

      try {
        const res = await axios.get(link, {
          responseType: "arraybuffer",
        });

        const parsedText = htmlToText(res.data.toString("utf8"), {
          selectors: [
            {
              selector: "a",
              options: {
                ignoreHref: true,
              },
            },
          ],
        })
          .replace(/(\r\n|\n|\r)/gm, " ")
          .replace(/\s+/g, " ")
          .trim();

        const splittedText = await splitter.splitText(parsedText);

        const title = res.data
          .toString("utf8")
          .match(/<title>(.*?)<\/title>/)?.[1];

        const linkDocs = splittedText.map((text) => {
          return new Document({
            pageContent: text,
            metadata: {
              title: title || link,
              url: link,
            },
          });
        });

        docs.push(...linkDocs);
      } catch (err) {
        console.error(
          "An error occurred while getting documents from links: ",
          err,
        );

        docs.push(
          new Document({
            pageContent: `Failed to retrieve content from the link: ${err}`,
            metadata: {
              title: "Failed to retrieve content",
              url: link,
            },
          }),
        );
      }
    }),
  );

  return docs;
};
