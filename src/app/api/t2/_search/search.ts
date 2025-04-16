import axios from "axios";
import { SearxngSearchResult } from "./types";
import chalk from "chalk";
export const searchSearxng = async (
  query: string
): Promise<{ results: SearxngSearchResult[]; suggestions: string[] }> => {
  const searxngUrl = process.env.SEARXNG_URL || "http://localhost:8080";
  const url = new URL(searxngUrl + "/search");
  url.searchParams.set("q", query);
  url.searchParams.append("format", "json");
  url.searchParams.append("max_results", "10");

  try {
    const res = await axios.get<{
      results: SearxngSearchResult[];
      suggestions: string[];
    }>(url.toString());

    return {
      results: res.data.results || [],
      suggestions: res.data.suggestions || [],
    };
  } catch (error: any) {
    console.error(
      chalk.red(
        `[SearXNG] Error fetching search results for query "${query}":`,
        error.message
      )
    );
    if (axios.isAxiosError(error) && error.response) {
      console.error(
        chalk.red("[SearXNG] Response Status:", error.response.status)
      );
      console.error(chalk.red("[SearXNG] Response Data:", error.response.data));
    }
    return { results: [], suggestions: [] };
  }
};
