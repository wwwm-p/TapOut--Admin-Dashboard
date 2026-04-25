import pkg from 'pg'

const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

export default async function handler(req, res) {
  try {
    const { student_id, counselor_id } = req.body

    if (!student_id || !counselor_id) {
      return res.status(400).json({ error: 'Missing fields' })
    }

    await pool.query(
      `UPDATE students
       SET counselor_id=$1
       WHERE id=$2`,
      [counselor_id, student_id]
    )

    res.status(200).json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
