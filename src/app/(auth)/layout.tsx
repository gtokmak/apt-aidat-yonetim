export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#fde68a_0%,#fff7ed_45%,#f8fafc_100%)] p-3 sm:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-5xl items-center justify-center sm:min-h-[calc(100vh-3rem)]">
        {children}
      </div>
    </div>
  );
}
