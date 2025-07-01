"use client"

import { useEffect, useState } from "react"

export function ModernDeFiBackground({ isDarkMode }: { isDarkMode: boolean }) {
  const [spots, setSpots] = useState<Array<{ id: number; x: number; y: number; size: number; delay: number }>>([])
  const [stars, setStars] = useState<Array<{ id: number; x: number; y: number; size: number; opacity: number }>>([])

  useEffect(() => {
    // Generate random floating spots for light mode
    const newSpots = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 200 + 100,
      delay: Math.random() * 10,
    }))
    setSpots(newSpots)

    // Generate star field for dark mode
    const newStars = Array.from({ length: 150 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.8 + 0.2,
    }))
    setStars(newStars)
  }, [])

  if (!isDarkMode) {
    // Light mode - keep existing design
    return (
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Main soft sky blue background */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100" />

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky-100/50 via-white/30 to-blue-100/50" />

        {/* Moving blurry yellow spots */}
        {spots.map((spot) => (
          <div
            key={spot.id}
            className="absolute rounded-full blur-3xl bg-yellow-300/20"
            style={{
              width: `${spot.size}px`,
              height: `${spot.size}px`,
              left: `${spot.x}%`,
              top: `${spot.y}%`,
              animation: `float-${spot.id} ${15 + spot.delay}s ease-in-out infinite`,
              animationDelay: `${spot.delay}s`,
            }}
          />
        ))}

        {/* Subtle grid pattern for DeFi feel */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(59,130,246,0.1) 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>
    )
  }

  // Dark mode - futuristic cosmic background
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Deep space base - rich indigo blacks */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-black" />

      {/* Primary concentric radial gradients */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 800px 600px at 20% 30%, rgba(236, 72, 153, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 600px 800px at 80% 20%, rgba(139, 92, 246, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse 700px 500px at 60% 80%, rgba(59, 130, 246, 0.10) 0%, transparent 50%),
            radial-gradient(ellipse 500px 700px at 10% 70%, rgba(251, 146, 60, 0.08) 0%, transparent 50%)
          `,
        }}
      />

      {/* Secondary layered gradients for depth */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 1200px 800px at 40% 10%, rgba(236, 72, 153, 0.08) 0%, transparent 60%),
            radial-gradient(ellipse 900px 1200px at 90% 60%, rgba(139, 92, 246, 0.06) 0%, transparent 60%),
            radial-gradient(ellipse 1000px 600px at 30% 90%, rgba(59, 130, 246, 0.05) 0%, transparent 60%)
          `,
        }}
      />

      {/* Volumetric bloom effects */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: `
            radial-gradient(ellipse 400px 300px at 25% 25%, rgba(236, 72, 153, 0.25) 0%, transparent 40%),
            radial-gradient(ellipse 350px 400px at 75% 30%, rgba(139, 92, 246, 0.20) 0%, transparent 40%),
            radial-gradient(ellipse 300px 250px at 70% 75%, rgba(59, 130, 246, 0.18) 0%, transparent 40%),
            radial-gradient(ellipse 250px 300px at 15% 80%, rgba(251, 146, 60, 0.15) 0%, transparent 40%)
          `,
          filter: "blur(60px)",
        }}
      />

      {/* Heavy gaussian blur layer */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `
            radial-gradient(ellipse 600px 400px at 30% 40%, rgba(236, 72, 153, 0.3) 0%, transparent 50%),
            radial-gradient(ellipse 500px 600px at 70% 20%, rgba(139, 92, 246, 0.25) 0%, transparent 50%),
            radial-gradient(ellipse 400px 300px at 80% 80%, rgba(59, 130, 246, 0.20) 0%, transparent 50%)
          `,
          filter: "blur(120px)",
        }}
      />

      {/* Star field speckles */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white animate-pulse"
          style={{
            width: `${star.size}px`,
            height: `${star.size}px`,
            left: `${star.x}%`,
            top: `${star.y}%`,
            opacity: star.opacity * 0.6,
            animationDuration: `${2 + Math.random() * 3}s`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}

      {/* Cosmic dust grain overlay */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 80%, rgba(236, 72, 153, 0.1) 1px, transparent 1px),
            radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.08) 1px, transparent 1px),
            radial-gradient(circle at 40% 40%, rgba(59, 130, 246, 0.06) 1px, transparent 1px),
            radial-gradient(circle at 60% 80%, rgba(251, 146, 60, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "100px 100px, 150px 150px, 80px 80px, 120px 120px",
          backgroundPosition: "0 0, 50px 50px, 25px 25px, 75px 75px",
        }}
      />

      {/* Subtle noise texture for 8K feel */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 1px,
              rgba(255, 255, 255, 0.03) 1px,
              rgba(255, 255, 255, 0.03) 2px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 1px,
              rgba(255, 255, 255, 0.03) 1px,
              rgba(255, 255, 255, 0.03) 2px
            )
          `,
          backgroundSize: "3px 3px",
        }}
      />

      {/* Animated floating orbs for extra depth */}
      <div
        className="absolute top-20 left-20 w-32 h-32 rounded-full opacity-20 animate-pulse"
        style={{
          background: "radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, transparent 70%)",
          filter: "blur(40px)",
          animationDuration: "4s",
        }}
      />
      <div
        className="absolute bottom-32 right-32 w-24 h-24 rounded-full opacity-15 animate-pulse"
        style={{
          background: "radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)",
          filter: "blur(30px)",
          animationDuration: "5s",
          animationDelay: "1s",
        }}
      />
      <div
        className="absolute top-1/2 right-20 w-20 h-20 rounded-full opacity-12 animate-pulse"
        style={{
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%)",
          filter: "blur(25px)",
          animationDuration: "6s",
          animationDelay: "2s",
        }}
      />

      {/* Floating animation keyframes */}
      <style jsx>{`
        @keyframes float-0 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(30px, -20px) scale(1.1); } }
        @keyframes float-1 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-25px, 15px) scale(0.9); } }
        @keyframes float-2 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(20px, 25px) scale(1.05); } }
        @keyframes float-3 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-15px, -30px) scale(0.95); } }
        @keyframes float-4 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(35px, 10px) scale(1.08); } }
        @keyframes float-5 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-20px, -15px) scale(0.92); } }
        @keyframes float-6 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(25px, -25px) scale(1.03); } }
        @keyframes float-7 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-30px, 20px) scale(0.97); } }
      `}</style>
    </div>
  )
}
