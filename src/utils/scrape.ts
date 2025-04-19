import axios from "axios";
import * as cheerio from "cheerio";
export const scrapeWebsite = async (url: string) => {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      maxRedirects: 3,
      timeout: 10000,
    });

    if (response.status !== 200) {
      console.error(
        `Error: Received status code ${response.status} for ${url}`,
      );
      return null;
    }
    const html = response.data;
    const $ = cheerio.load(html);
    const title = $("h1").first().text().trim();
    let $contentArea = $("article");
    if ($contentArea.length === 0) {
      $contentArea = $("main");
    }
    if ($contentArea.length === 0) {
      console.warn(
        `No specific content area (article, main) found for ${url}. Falling back to body.`,
      );
      $contentArea = $("body");
    }

    const potentialTextElementsSelector =
      "p, div:not(:has(article, aside, blockquote, div, figure, footer, form, h1, h2, h3, h4, h5, h6, header, hr, li, main, nav, ol, p, pre, section, table, ul))";
    const paragraphs: string[] = [];
    const minTextLength = 25;

    $contentArea.find(potentialTextElementsSelector).each((index, element) => {
      const $el = $(element);

      if ($el.closest("nav, header, footer, aside, form").length > 0) {
        return;
      }

      const elementText = $el.text().trim();

      if (elementText.length >= minTextLength) {
        const linkTextLength = $el.find("a").text().length;
        const elementTextLength = elementText.length;
        if (elementTextLength > 0 && linkTextLength / elementTextLength > 0.7) {
          return;
        }
        if (!paragraphs.includes(elementText)) {
          paragraphs.push(elementText);
        }
      }
    });
    const scrapedData = {
      url: url,
      title: title || "Title not found",
      paragraphs: paragraphs,
    };

    console.log(`Successfully scraped data from: ${url}`);
    console.log(JSON.stringify(scrapedData, null, 2));
    return scrapedData;
  } catch (error: any) {
    console.error(`Error scraping ${url}:`, error.message);
    return null;
  }
};

scrapeWebsite(
  "https://weather.com/weather/tenday/l/Manhattan+NY?canonicalCityId=60b5c1800361f33890fcedaa749a5e3a",
);
