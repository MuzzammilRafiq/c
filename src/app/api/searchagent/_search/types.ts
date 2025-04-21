import { Message } from "~/app/(home)/chat/[id]/_components/types";

export interface SearxngSearchOptions {
  category?: string[];
  engines?: string[];
  language?: string;
  pageno?: number;
}

export interface SearxngSearchResult {
  title: string;
  url: string;
  img_src?: string;
  content: string;
  thumbnail?: string;
  thumbnail_src?: string;
  author?: string;
  iframe_src?: string;
  publishedDate?: string;
  engines?: string[];
  positions?: number[];
  score?: number;
  engine?: string;
  template?: string;
  parsed_url?: string[];
  priority?: string;
  category?: string;
}
export interface SearchAgentResult {
  answer: string;
  sources: Document[];
}

export interface RequestBody {
  query: string;
  history: Message[];
  model?: string;
  systemInstructions?: string;
}
