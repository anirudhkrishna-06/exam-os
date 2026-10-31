import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://exam_user:exam_dev_password@localhost:5432/exam_os'
})

async function run() {
  const filePath = path.join(process.cwd(), 'db/migrations/0001_smart_winter_soldier.sql')
  const sql = fs.readFileSync(filePath, 'utf8')
  const statements = sql.split('--> statement-breakpoint')

  console.log(`Applying ${statements.length} migration statements...`)
  for (let i = 0; i < statements.length; i++) {
    const s = statements[i].trim()
    if (!s) continue
    try {
      await pool.query(s)
      console.log(`[${i + 1}/${statements.length}] Done:`, s.substring(0, 45).replace(/\n/g, ' ') + '...')
    } catch (err: any) {
      // If type already exists or table exists, log and continue if appropriate
      if (err.code === '42710') {
        console.log(`[${i + 1}/${statements.length}] Type already exists, continuing...`)
      } else {
        console.error(`Error executing statement ${i + 1}:`, s, err)
        throw err
      }
    }
  }
  console.log('Phase 2 migration applied successfully!')
  await pool.end()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

