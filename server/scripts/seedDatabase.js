/*
  Seed Database: Creates a test teacher and student if they don't exist.
  Usage: npm run db:seed
*/

const bcrypt = require('bcryptjs')
const { connectDB } = require('../database')
const { User } = require('../models')

async function upsertUser({ name, email, username, role, plainPassword }) {
  const existing = await User.findOne({ email })
  if (existing) {
    // Ensure core fields are set; don't overwrite existing password
    existing.name = existing.name || name
    existing.username = existing.username || username
    existing.role = existing.role || role
    existing.isActive = true
    await existing.save()
    return existing
  }

  const passwordHash = await bcrypt.hash(plainPassword, 10)
  const user = new User({
    name,
    email,
    username,
    role,
    passwordHash,
    isActive: true,
  })
  await user.save()
  return user
}

async function main() {
  try {
    await connectDB()

    const teacher = await upsertUser({
      name: 'Test Teacher',
      email: 'teacher@test.com',
      username: 'teacher',
      role: 'teacher',
      plainPassword: 'teacher123',
    })

    const student = await upsertUser({
      name: 'Test Student',
      email: 'student@test.com',
      username: 'student',
      role: 'student',
      plainPassword: 'student123',
    })

    console.log('✅ Seed complete')
    console.log('Teacher:', { id: teacher._id.toString(), email: teacher.email, username: teacher.username })
    console.log('Student:', { id: student._id.toString(), email: student.email, username: student.username })

    process.exit(0)
  } catch (err) {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  }
}

main()
