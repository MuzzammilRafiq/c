// app/api/auth/[...nextauth]/route.ts
import { handlers } from "~/auth"; // Adjust the import path based on your project structure
export const { GET, POST } = handlers;
