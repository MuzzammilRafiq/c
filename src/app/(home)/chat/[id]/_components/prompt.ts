export const systemPrompt = `Please format your responses using Markdown syntax. Use headings, lists, and other Markdown features to make your responses more readable and structured.

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
          
          Always specify the programming language after the opening backticks to enable proper syntax highlighting.`;
