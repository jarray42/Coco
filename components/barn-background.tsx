"use client"

export function BarnBackground({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Wood plank texture overlay */}
      <div
        className={`absolute inset-0 opacity-20 ${isDarkMode ? "opacity-10" : "opacity-20"}`}
        style={{
          backgroundImage: `
            linear-gradient(90deg, transparent 0%, rgba(139, 69, 19, 0.1) 2%, transparent 4%),
            linear-gradient(0deg, transparent 0%, rgba(160, 82, 45, 0.1) 1%, transparent 3%),
            linear-gradient(90deg, rgba(139, 69, 19, 0.05) 0%, transparent 50%, rgba(139, 69, 19, 0.05) 100%)
          `,
          backgroundSize: "100px 20px, 20px 100px, 200px 100px",
        }}
      />

      {/* Hay particles floating */}
      <div
        className="absolute top-10 left-10 w-2 h-6 bg-yellow-600 opacity-30 rotate-12 animate-bounce"
        style={{ animationDelay: "0s", animationDuration: "3s" }}
      />
      <div
        className="absolute top-32 right-20 w-1 h-4 bg-yellow-500 opacity-40 rotate-45 animate-bounce"
        style={{ animationDelay: "1s", animationDuration: "4s" }}
      />
      <div
        className="absolute bottom-40 left-1/4 w-2 h-5 bg-yellow-700 opacity-25 -rotate-12 animate-bounce"
        style={{ animationDelay: "2s", animationDuration: "3.5s" }}
      />
      <div
        className="absolute top-1/2 right-1/3 w-1 h-3 bg-yellow-600 opacity-35 rotate-90 animate-bounce"
        style={{ animationDelay: "0.5s", animationDuration: "4.5s" }}
      />

      {/* Comic book style rays/lines */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div
          className={`absolute top-20 left-20 w-32 h-1 ${isDarkMode ? "bg-yellow-400/20" : "bg-yellow-600/30"} rotate-12 animate-pulse`}
        />
        <div
          className={`absolute bottom-32 right-32 w-24 h-1 ${isDarkMode ? "bg-orange-400/20" : "bg-orange-600/30"} -rotate-12 animate-pulse`}
          style={{ animationDelay: "1s" }}
        />
        <div
          className={`absolute top-1/2 left-10 w-20 h-1 ${isDarkMode ? "bg-red-400/20" : "bg-red-600/30"} rotate-45 animate-pulse`}
          style={{ animationDelay: "2s" }}
        />
      </div>
    </div>
  )
}
