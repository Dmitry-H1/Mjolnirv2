export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="grid-overlay absolute inset-0 pointer-events-none" />
      {children}
    </div>
  );
}
