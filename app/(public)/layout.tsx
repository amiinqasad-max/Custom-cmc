export default function PublicLayout({ children }: LayoutProps<"/">) {
  return <div className="flex min-h-svh flex-col">{children}</div>;
}
