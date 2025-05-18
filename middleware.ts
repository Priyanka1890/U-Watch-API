import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Skip authentication for the documentation page
  if (request.nextUrl.pathname === "/") {
    return NextResponse.next()
  }

  const apiKey = request.headers.get("x-api-key")

  // Check if API key is provided and matches the environment variable
  // For development, you can bypass this check uwatch-api-12345-xyz-67890-abc
  if (process.env.NODE_ENV !== "development") {
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/api/:path*",
}
