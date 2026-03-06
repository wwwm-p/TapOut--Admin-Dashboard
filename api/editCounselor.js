// pages/api/editcounselor.js
import { neon } from "@neondatabase/serverless";

// Admin API: manage counselors, assign students, and import SIS data
export default async function handler(req, res) {
  const sql = neon(process.env.NEON_DATABASE_URL);

  try {
    // ------------------------
    // GET → list all counselors
    // ------------------------
    if (req.method === "GET") {
      const counselors = await sql`
        SELECT 
          counselor_id AS id,
          username AS name,
          email,
          active,
          metadata
        FROM counselors
        ORDER BY username ASC
      `;
      return res.status(200).json({ success: true, counselors });
    }

    // ------------------------
    // POST → handle actions
    // ------------------------
    if (req.method === "POST") {
      const { action } = req.body;

      if (!action) {
        return res.status(400).json({ success: false, error: "Missing action field" });
      }

      // ------------------------
      // 1️⃣ Update counselor active status
      // ------------------------
      if (action === "update_counselor") {
        const { id, active } = req.body;
        if (id == null || typeof active !== "boolean") {
          return res.status(400).json({ success: false, error: "Missing or invalid id/active value" });
        }

        const result = await sql`
          UPDATE counselors
          SET active = ${active}
          WHERE counselor_id = ${id}
          RETURNING counselor_id
        `;

        if (!result || result.length === 0) {
          return res.status(404).json({ success: false, error: "Counselor not found" });
        }

        return res.status(200).json({ success: true, updated: result[0].counselor_id });
      }

      // ------------------------
      // 2️⃣ SIS Sync → import/update students
      // ------------------------
      if (action === "sync_sis") {
        const { students } = req.body;
        if (!Array.isArray(students) || students.length === 0) {
          return res.status(400).json({ success: false, error: "students must be a non-empty array" });
        }

        let count = 0;
        for (const s of students) {
          if (!s.student_id || !s.first_name || !s.last_name) continue;

          const metadata = { ...s };
          delete metadata.student_id;
          delete metadata.first_name;
          delete metadata.last_name;
          delete metadata.grade;

          const gradeValue = s.grade || null; // optional grade

          await sql`
            INSERT INTO users (student_id, first_name, last_name, grade, metadata)
            VALUES (${s.student_id}, ${s.first_name}, ${s.last_name}, ${gradeValue}, ${metadata})
            ON CONFLICT (student_id)
            DO UPDATE SET
              first_name = EXCLUDED.first_name,
              last_name  = EXCLUDED.last_name,
              grade      = EXCLUDED.grade,
              metadata   = EXCLUDED.metadata
          `;
          count++;
        }

        return res.status(200).json({ success: true, imported: count });
      }

      // ------------------------
      // 3️⃣ Assign student to counselor
      // ------------------------
      if (action === "assign_student") {
        const { student_id, counselor_id } = req.body;
        if (!student_id || !counselor_id) {
          return res.status(400).json({ success: false, error: "Missing student_id or counselor_id" });
        }

        await sql`
          INSERT INTO student_counselor_assignments (student_id, counselor_id)
          VALUES (${student_id}, ${counselor_id})
          ON CONFLICT (student_id, counselor_id) DO NOTHING
        `;

        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ success: false, error: "Unknown action" });
    }

    // ------------------------
    // Method not allowed
    // ------------------------
    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (error) {
    console.error("Admin API error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
