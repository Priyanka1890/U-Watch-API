import { neon } from "@neondatabase/serverless"

// Initialize Neon client with connection string from environment variable
export const sql = neon(process.env.DATABASE_URL!)

// Helper function to handle database errors
export async function executeQuery<T>(queryFn: () => Promise<T>): Promise<{ data: T | null; error: string | null }> {
  try {
    const result = await queryFn()
    return { data: result, error: null }
  } catch (error) {
    console.error("Database error:", error)
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown database error",
    }
  }
}
