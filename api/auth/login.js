import pkg from 'pg'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export default async function handler(req, res) {
  const { email, password } = req.body

  const result = await pool.query(
    'SELECT * FROM users WHERE email=$1',
    [email]
  )

  if (!result.rows.length) return res.status(401).json({ error: 'User not found' })

  const user = result.rows[0]

  const valid = await bcrypt.compare(password, user.password_hash || '')
  if (!valid) return res.status(401).json({ error: 'Invalid password' })

  const token = jwt.sign(
    { id: user.id, role: user.role, school_id: user.school_id },
    process.env.JWT_SECRET
  )

  res.json({ token, user })
}
