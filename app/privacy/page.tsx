"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { ElegantFooter } from "@/components/elegant-footer"
import { ModernDeFiBackground } from "@/components/modern-defi-background"
import { AuthModal } from "@/components/auth-modal"
import { useState, useEffect } from "react"
import { getCurrentUser, onAuthStateChange, type AuthUser } from "@/utils/supabase-auth"
import { UserMenu } from "@/components/user-menu"
import { Sun, Moon, ArrowLeft, Eye, Database, Lock, Mail, Globe, Users } from "lucide-react"

export default function PrivacyPolicyPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  
  useEffect(() => {
    getCurrentUser().then(({ user }) => setUser(user as AuthUser | null))
    const { data: { subscription } } = onAuthStateChange((user) => setUser(user))
    return () => subscription.unsubscribe()
  }, [])
  
  const handleSignOut = () => setUser(null)

  const sections = [
    {
      icon: <Eye className="w-6 h-6" />,
      title: "Information We Collect",
      content: "We collect information you provide directly to us, such as when you create an account, use our services, or contact us. This includes your email address, portfolio data you choose to share, and preferences for notifications and alerts."
    },
    {
      icon: <Database className="w-6 h-6" />,
      title: "How We Use Your Information",
      content: "We use your information to provide our crypto tracking services, send you relevant alerts and notifications, improve our platform, and communicate with you about your account and our services."
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: "Data Security",
      content: "We implement robust security measures to protect your personal information. Your data is encrypted both in transit and at rest, and we use industry-standard authentication protocols to keep your account secure."
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Information Sharing",
      content: "We do not sell, trade, or otherwise transfer your personal information to third parties. We may share anonymized, aggregated data for research and improvement purposes, but never your personal information."
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Cookies & Analytics",
      content: "We use essential cookies to provide our services and may use analytics tools to understand how our platform is used. You can control cookie preferences through your browser settings."
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Your Rights",
      content: "You have the right to access, update, or delete your personal information at any time. You can manage your notification preferences, export your data, or delete your account through your profile settings."
    }
  ]

  return (
    <div className={`min-h-screen relative flex flex-col transition-all duration-1000 ${isDarkMode ? "dark bg-slate-900" : ""}`}>
      <ModernDeFiBackground isDarkMode={isDarkMode} />
      <div className="relative z-10 max-w-6xl mx-auto p-4 flex flex-col min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                variant="outline"
                className={`h-10 w-10 p-0 rounded-xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
                  isDarkMode
                    ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 hover:scale-105"
                    : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900 hover:scale-105"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <SiteHeader isMainPage={false} isDarkMode={isDarkMode} />
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsDarkMode(!isDarkMode)}
              variant="outline"
              className={`h-10 px-4 rounded-xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
                isDarkMode
                  ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 hover:scale-105"
                  : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900 hover:scale-105"
              }`}
            >
              {isDarkMode ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              {isDarkMode ? "Light" : "Dark"}
            </Button>
            {user ? (
              <UserMenu user={user} isDarkMode={isDarkMode} onSignOut={handleSignOut} />
            ) : null}
          </div>
        </div>

        {/* Hero Section */}
        <section className="mb-12 text-center">
          <div className="flex items-center justify-center mb-4">
            <Image 
              src="/privacy.png"
              alt="Privacy Policy"
              width={160}
              height={160}
              className="w-40 h-40"
            />
          </div>
          <h1 className={`font-heading text-5xl md:text-6xl font-semibold tracking-tight leading-tight mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            Privacy Policy
          </h1>
          <p className={`text-lg md:text-xl mb-6 ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>
            Your privacy is important to us. Here's how we protect and handle your data.
          </p>
          <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
            Last updated: August 2025
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-black/10 mb-12" />

        {/* Privacy Sections */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {sections.map((section, index) => (
            <div
              key={index}
              className={`rounded-3xl p-8 shadow-xl border transition-all duration-300 hover:scale-[1.02] ${
                isDarkMode 
                  ? "bg-slate-800/60 border-slate-700/50 backdrop-blur-md" 
                  : "bg-white/70 border-white/40 backdrop-blur-md"
              }`}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 rounded-full ${isDarkMode ? "bg-green-500/20" : "bg-green-100"}`}>
                  <div className={`${isDarkMode ? "text-green-400" : "text-green-600"}`}>
                    {section.icon}
                  </div>
                </div>
                <h3 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  {section.title}
                </h3>
              </div>
              <p className={`leading-relaxed ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>
                {section.content}
              </p>
            </div>
          ))}
        </section>

        {/* Additional Information */}
        <section className={`rounded-3xl p-8 mb-12 shadow-xl border ${
          isDarkMode 
            ? "bg-gradient-to-br from-green-900/60 to-emerald-900/60 border-green-500/50 backdrop-blur-md" 
            : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 backdrop-blur-md"
        }`}>
          <h3 className={`text-2xl font-bold mb-6 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            Questions or Concerns?
          </h3>
          <p className={`text-lg mb-6 ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>
            We believe in transparency and want you to feel confident about how we handle your data. If you have any questions about this privacy policy or our data practices, please don't hesitate to reach out.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/contact">
              <Button
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  isDarkMode
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                Contact Us
              </Button>
            </Link>
            <a href="mailto:cocoricoins@gmail.com">
              <Button
                variant="outline"
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
                  isDarkMode
                    ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100"
                    : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900"
                }`}
              >
                Email Us Directly
              </Button>
            </a>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-black/10 mb-12" />
        
        <ElegantFooter isDarkMode={isDarkMode} />
      </div>
    </div>
  )
}
