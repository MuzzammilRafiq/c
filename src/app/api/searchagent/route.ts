import { NextResponse } from "next/server";
import { main } from "./_search/main";
import { RequestBody } from "./_search/types";
export async function POST(req: Request) {
  try {
    const {
      query,
      history,
      model = "gemini-2.0-flash", // Optional: allow model selection via API
      systemInstructions = "Provide a concise summary in bullet points.",
    }: RequestBody = await req.json();

    if (!query) {
      return NextResponse.json({ message: "Query is required" }, { status: 400 });
    }

    const res = await main({
      model,
      query,
      history,
      systemInstructions,
    });
    if (res.sucess === false) {
      throw new Error(res.message);
    }
    return NextResponse.json(
      {
        data: res.data,
        status: "success",
      },
      { status: 200 },
    );
  } catch (error) {
    console.log("Error in GET /api/searchagent:", error);
    return NextResponse.json(
      {
        message: "Internal Server Error",
        status: "error",
      },
      { status: 500 },
    );
  }
}
