export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh relative overflow-hidden bg-cream-100 dark:bg-ink-950">
      {/* Animated gradient blobs background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-40 blur-3xl animate-float"
          style={{
            background:
              'radial-gradient(circle, #f97316 0%, #ec4899 50%, transparent 70%)',
          }}
        />
        <div
          className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full opacity-30 blur-3xl animate-float"
          style={{
            background:
              'radial-gradient(circle, #8b5cf6 0%, #3b82f6 50%, transparent 70%)',
            animationDelay: '2s',
          }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full opacity-30 blur-3xl animate-float"
          style={{
            background:
              'radial-gradient(circle, #10b981 0%, #14b8a6 50%, transparent 70%)',
            animationDelay: '4s',
          }}
        />
      </div>

      <div className="relative z-10 min-h-dvh flex items-center justify-center p-6">
        {children}
      </div>
    </div>
  );
}
