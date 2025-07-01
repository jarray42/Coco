"use client"

export function ElegantBackground({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Main white background with subtle blurry spots */}
      <div className="absolute inset-0 bg-white" />

      {/* Blurry colored spots */}
      <div
        className="absolute top-20 left-20 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-40 right-32 w-80 h-80 rounded-full opacity-15 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(249, 115, 22, 0.25) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-32 left-1/3 w-72 h-72 rounded-full opacity-10 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(234, 179, 8, 0.2) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-1/2 right-20 w-64 h-64 rounded-full opacity-12 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(217, 119, 6, 0.18) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-20 right-1/4 w-88 h-88 rounded-full opacity-8 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%)",
        }}
      />

      {/* Subtle floating particles */}
      <div
        className="absolute top-10 left-10 w-1 h-4 bg-yellow-400 opacity-20 rotate-12 animate-bounce"
        style={{ animationDelay: "0s", animationDuration: "4s" }}
      />
      <div
        className="absolute top-32 right-20 w-1 h-3 bg-orange-400 opacity-15 rotate-45 animate-bounce"
        style={{ animationDelay: "2s", animationDuration: "5s" }}
      />
      <div
        className="absolute bottom-40 left-1/4 w-1 h-3 bg-amber-400 opacity-10 -rotate-12 animate-bounce"
        style={{ animationDelay: "3s", animationDuration: "4.5s" }}
      />
    </div>
  )
}
