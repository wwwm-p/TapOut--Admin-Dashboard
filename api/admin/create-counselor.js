import pkg from 'pg'
import bcrypt from 'bcrypt'

const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export default async function handler(req, res) {
  const { name, email, password, school_id } = req.body

  const hash = await bcrypt.hash(password, 10)

  const result = await pool.query(
    `INSERT INTO users (name,email,password_hash,role,school_id)
     VALUES ($1,$2,$3,'counselor',$4)
     RETURNING *`,
    [name, email, hash, school_id]
  )

  res.json(result.rows[0])
}
