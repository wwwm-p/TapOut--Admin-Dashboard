import pkg from 'pg'

const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

export default async function handler(req, res) {
  try {
    const { id, name, email, is_visible } = req.body

    if (!id) {
      return res.status(400).json({ error: 'Missing counselor id' })
    }

    const result = await pool.query(
      `UPDATE users
       SET name=$1, email=$2, is_visible=$3
       WHERE id=$4
       RETURNING id, name, email, is_visible`,
      [name, email, is_visible, id]
    )

    res.status(200).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
