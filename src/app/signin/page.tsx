// src/app/signin/page.tsx
"use client";

import { Suspense } from "react";
import SignInInner from "./SignInInner";

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="text-white p-6">Loading sign-in...</div>}>
      <SignInInner />
    </Suspense>
  );
}
