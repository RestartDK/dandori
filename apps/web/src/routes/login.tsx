import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const [showSignIn, setShowSignIn] = useState(true);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {showSignIn ? (
        <SignInForm
          className="w-full max-w-md"
          onSwitchToSignUp={() => setShowSignIn(false)}
        />
      ) : (
        <SignUpForm
          className="w-full max-w-md"
          onSwitchToSignIn={() => setShowSignIn(true)}
        />
      )}
    </div>
  );
}
