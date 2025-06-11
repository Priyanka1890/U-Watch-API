// lib/db.ts
import { Pool } from 'pg';

// Initialize a connection pool to your Postgres database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // If you're using SSL (e.g. production), uncomment the lines below:
  // ssl: {
  //   rejectUnauthorized: false,
  // },
});

// A simple tagged-template helper so you can keep using sql`...` in your route handlers
export const sql = (
  strings: TemplateStringsArray,
  ...values: any[]
) => {
  // Convert the template literal into a parameterized query:
  // e.g. `SELECT * FROM users WHERE id = ${userId}`
  // becomes text = 'SELECT * FROM users WHERE id = $1' and values = [userId]
  const text = strings.reduce((acc, str, i) => {
    const placeholder = i < values.length ? `$${i + 1}` : '';
    return acc + str + placeholder;
  }, '');
  return pool.query(text, values).then(res => res.rows);
};

// Keep your executeQuery wrapper for consistent error handling
export async function executeQuery<T>(
  queryFn: () => Promise<T>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const result = await queryFn();
    return { data: result, error: null };
  } catch (error) {
    console.error('Database error:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}
