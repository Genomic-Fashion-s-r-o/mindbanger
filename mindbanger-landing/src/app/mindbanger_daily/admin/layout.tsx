export default function AdminRootLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    // 3. Ak nema spravnu rolu, vrati admin layout (uz bez Premium / Checkout logiky)
    return (
      <div className="min-h-screen bg-slate-950 text-white selection:bg-amber-500/30">
        <main className="max-w-6xl mx-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    );
  }