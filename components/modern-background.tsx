"use client"

export function ModernBackground({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Main background */}
      <div className={`absolute inset-0 ${isDarkMode ? "bg-gray-950" : "bg-white"}`} />

      {/* Subtle gradient overlay */}
      <div
        className={`absolute inset-0 ${
          isDarkMode
            ? "bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950"
            : "bg-gradient-to-br from-white via-amber-50/30 to-white"
        }`}
      />

      {/* Elegant blurry spots */}
      <div
        className={`absolute top-20 left-20 w-96 h-96 rounded-full blur-3xl transition-all duration-1000 ${
          isDarkMode ? "bg-amber-500/10" : "bg-amber-200/40"
        }`}
      />
      <div
        className={`absolute top-40 right-32 w-80 h-80 rounded-full blur-3xl transition-all duration-1000 ${
          isDarkMode ? "bg-orange-500/8" : "bg-orange-200/30"
        }`}
      />
      <div
        className={`absolute bottom-32 left-1/3 w-72 h-72 rounded-full blur-3xl transition-all duration-1000 ${
          isDarkMode ? "bg-yellow-500/6" : "bg-yellow-200/25"
        }`}
      />
      <div
        className={`absolute top-1/2 right-20 w-64 h-64 rounded-full blur-3xl transition-all duration-1000 ${
          isDarkMode ? "bg-amber-600/12" : "bg-amber-300/35"
        }`}
      />

      {/* Subtle grid pattern */}
      <div
        className={`absolute inset-0 opacity-[0.02] ${isDarkMode ? "opacity-[0.05]" : "opacity-[0.02]"}`}
        style={{
          backgroundImage: `
            linear-gradient(${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"} 1px, transparent 1px),
            linear-gradient(90deg, ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"} 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />
    </div>
  )
}
