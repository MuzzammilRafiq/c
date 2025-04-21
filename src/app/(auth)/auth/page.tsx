// Original AuthPage component file (e.g., app/auth/page.tsx)
"use client";
import {
  useSession,
  signIn /* signOut removed if not used elsewhere */,
} from "next-auth/react";
import { useRouter } from "next/navigation";
import SignOutButton from "~/components/SignOutButton"; // Adjust the import path based on your file structure

export default function AuthPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Common container styles (keep as is)
  const containerClasses =
    "flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 dark:from-gray-800 dark:via-gray-900 dark:to-black px-4";
  const cardClasses =
    "w-full max-w-md p-4 space-y-6 bg-white rounded-xl shadow-lg dark:bg-gray-800 relative z-10";
  // titleClasses and textClasses remain if used, otherwise remove
  const titleClasses =
    "text-3xl font-bold text-center text-gray-800 dark:text-white";
  const textClasses = "text-center text-gray-600 dark:text-gray-300";
  // Keep buttonBaseClasses as it's used by the Google sign-in button
  const buttonBaseClasses =
    "w-full px-4 py-2 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ease-in-out";

  if (status === "loading") {
    return (
      <div className={containerClasses}>
        <div className="text-center">
          <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
            Loading session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      {/* Background text (keep as is) */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[20vw] font-bold opacity-5 dark:opacity-10 select-none">
          c-agent
        </span>
      </div>

      {session ? (
        <div className={cardClasses}>
          <p className="text-center text-gray-600 dark:text-gray-400 font-bold break-all text-xl">
            {session.user?.email || "No email associated"}
          </p>
          {/* Use the new SignOutButton component */}
          <SignOutButton />
        </div>
      ) : (
        <div className={cardClasses}>
          {/* Google Sign-in button remains the same */}
          <button
            className={`${buttonBaseClasses} cursor-pointer bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 flex items-center justify-center space-x-2`}
            onClick={() => {
              signIn("google");
              router.replace("/");
            }}
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              {/* SVG paths... */}
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>
      )}
    </div>
  );
}
