"use client";

import { signOut } from "next-auth/react";
import React from "react";

interface SignOutButtonProps {
  className?: string;
}

const SignOutButton: React.FC<SignOutButtonProps> = ({ className = "" }) => {
  const buttonBaseClasses =
    "w-full px-4 py-2 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ease-in-out";

  const signOutSpecificClasses =
    "cursor-pointer mx-auto bg-red-500 text-white hover:bg-red-600 focus:ring-red-500";

  return (
    <button
      onClick={() => signOut()}
      className={`${buttonBaseClasses} ${signOutSpecificClasses} ${className}`}
    >
      Sign Out
    </button>
  );
};

export default SignOutButton;
