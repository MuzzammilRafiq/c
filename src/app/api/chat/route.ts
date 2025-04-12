import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '');

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Get the generative model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Format messages for the Gemini API
          const formattedMessages = messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          }));
          
          // Add a system message to instruct the model to use Markdown with proper code formatting
          const systemMessage = {
            role: 'user',
            parts: [{ text: `Please format your responses using Markdown syntax. Use headings, lists, and other Markdown features to make your responses more readable and structured.

When including code examples, always use proper code blocks with language specification like this:

\`\`\`javascript
// JavaScript code example
const greeting = "Hello, world!";
console.log(greeting);
\`\`\`

\`\`\`python
# Python code example
def greet(name):
    return f"Hello, {name}!"
print(greet("World"))
\`\`\`

Always specify the programming language after the opening backticks to enable proper syntax highlighting.` }]
          };
          
          // Generate content with streaming using the full conversation history
          const result = await model.generateContentStream({
            contents: [systemMessage, ...formattedMessages]
          });
          
          // Process each chunk as it arrives
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }
          
          // Send end of stream marker
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    // Return the streaming response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
} 