import { neon } from "@neondatabase/serverless";

// This API allows admin to:
// 1. GET → list all counselors
// 2. POST → update counselor active status (show/hide for students)

export default async function handler(req, res) {
  // Connect to your Neon database via environment variable
  const sql = neon(process.env.DATABASE_URL);

  try {
    // GET → return all counselors
    if (req.method === "GET") {
      const counselors = await sql`
        SELECT id, name, email, active
        FROM counselors
        ORDER BY name ASC
      `;
      return res.status(200).json(counselors);
    }

    // POST → update a counselor's active status
    if (req.method === "POST") {
      const { id, active } = req.body;

      if (id == null || active == null) {
        return res.status(400).json({ error: "Missing id or active value" });
      }

      await sql`
        UPDATE counselors
        SET active = ${active}
        WHERE id = ${id}
      `;

      return res.status(200).json({ success: true });
    }

    // Method not allowed
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
