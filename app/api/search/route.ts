import { NextResponse } from "next/server"

// Force dynamic rendering - prevent static analysis during build
export const dynamic = 'force-dynamic'


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")

  if (!query) {
    return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
  }

  try {
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`

    // This is a server-to-server request, not subject to browser CORS policy.
    const response = await fetch(searchUrl, {
      headers: {
        // It's good practice to set a user-agent
        "User-Agent": "Mozilla/5.0 (compatible; CocoriBot/1.0; +https://coinbeat.app/bot)",
      },
    })

    if (!response.ok) {
      console.error(`DuckDuckGo API error: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error(`DuckDuckGo response body: ${errorText}`)
      return NextResponse.json({ error: "Failed to fetch from search API" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in search proxy:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
