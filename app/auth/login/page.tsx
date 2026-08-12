import { Suspense } from "react";

import { LoginForm } from "@/components/admin/login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            C
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Sign in to your CMS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage articles, media, SEO, ads and more.
          </p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
