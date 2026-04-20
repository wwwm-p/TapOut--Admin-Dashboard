import pkg from 'pg'

const { Pool } = pkg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

export default async function handler(req, res) {
  try {
    const { first_name, last_name, student_id, counselor_id, school_id } = req.body

    const result = await pool.query(
      `INSERT INTO students (first_name, last_name, student_id, counselor_id, school_id)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [first_name, last_name, student_id, counselor_id, school_id]
    )

    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
