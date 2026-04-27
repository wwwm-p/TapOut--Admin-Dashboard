import pkg from 'pg'
import bcrypt from 'bcrypt'

const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

export default async function handler(req, res) {
  try {
    const { name, email, password, school_id } = req.body

    if (!name || !email || !password || !school_id) {
      return res.status(400).json({ error: 'Missing fields' })
    }

    const hash = await bcrypt.hash(password, 10)

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, school_id)
       VALUES ($1,$2,$3,'counselor',$4)
       RETURNING id, name, email`,
      [name, email, hash, school_id]
    )

    res.status(200).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
