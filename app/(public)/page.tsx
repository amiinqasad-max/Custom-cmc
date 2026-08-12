// Placeholder home page — replaced with the real article-listing homepage
// (site header/footer from Menus, featured + recent articles) once the Posts
// and Menus admin exist. See lib/content and services/posts.service.ts.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Site under construction</h1>
      <p className="text-muted-foreground">
        The public homepage renders here once articles are published. In the meantime,{" "}
        <a href="/auth/login" className="underline underline-offset-4">
          sign in to the CMS
        </a>
        .
      </p>
    </main>
  );
}
