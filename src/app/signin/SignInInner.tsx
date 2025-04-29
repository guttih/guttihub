"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function SignInInner() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-6">Welcome to Guttihub 📺</h1>
      <p className="mb-4 text-gray-400">Please sign in to continue</p>
      <button
        onClick={() => signIn("google", { callbackUrl })}
        className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded text-lg font-semibold"
      >
        Sign in with Google
      </button>
    </div>
  );
}
