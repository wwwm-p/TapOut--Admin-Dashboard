import pkg from 'pg'

const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

export default async function handler(req, res) {
  try {
    const { school_id } = req.query

    const result = await pool.query(
      `SELECT s.*, u.name as counselor_name
       FROM students s
       LEFT JOIN users u ON s.counselor_id = u.id
       WHERE s.school_id=$1`,
      [school_id]
    )

    res.status(200).json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
