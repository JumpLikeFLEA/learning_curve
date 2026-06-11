/**
 * One-off seed script: inserts all questions from data/questions.json
 * into the Supabase questions table.
 *
 * Run with:
 *   npx tsx scripts/seed-questions.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * in your .env.local (service role key bypasses RLS for the seed).
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const supabase = createClient(url, key)

const questionsPath = join(process.cwd(), 'data', 'questions.json')
const questions = JSON.parse(readFileSync(questionsPath, 'utf-8'))

async function seed() {
  console.log(`Seeding ${questions.length} questions…`)

  const { error } = await supabase
    .from('questions')
    .upsert(questions, { onConflict: 'id' })

  if (error) {
    console.error('Seed failed:', error.message)
    process.exit(1)
  }

  console.log('Done.')
}

seed()
