// src/components/LoginControls.tsx
"use client"; // 👈 REQUIRED

import { signIn, signOut, useSession } from "next-auth/react";
import React from "react";

export default function LoginControls() {
  const { data: session, status } = useSession();

  if (status === "loading") return <p>Loading...</p>;

  return (
    <div className="flex items-center gap-4">
      {session ? (
        <>
          <span>Hello, {session.user?.name || session.user?.email}</span>
          <button onClick={() => signOut()} className="bg-red-600 px-3 py-1 rounded">
            Logout
          </button>
        </>
      ) : (
        <button onClick={() => signIn("google")} className="bg-green-600 px-3 py-1 rounded">
          Login with Google
        </button>
      )}
    </div>
  );
}
