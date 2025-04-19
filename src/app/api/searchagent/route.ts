import { NextResponse } from "next/server";
import { main } from "./_search/main";
export async function GET() {
  try {
    const res = await main({
      model: "gemini-2.0-flash",
      query: "What is the capital of France?",
    });
    if (res.sucess === false) {
      throw new Error(res.message);
    }

    return NextResponse.json(
      {
        data: res.data,
        status: "success",
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error in GET /api/searchagent:", error);
    return NextResponse.json(
      {
        message: "Internal Server Error",
        status: "error",
      },
      { status: 500 }
    );
  }
}
