import { setRegistrationEnabled } from '../services/app-settings.service'

async function main() {
  const value = process.argv[2]?.toLowerCase()
  if (value !== 'on' && value !== 'off') {
    console.error('Usage: npm run enrollment:on | npm run enrollment:off')
    process.exitCode = 1
    return
  }

  await setRegistrationEnabled(value === 'on')
  console.log(`New user enrollment is now ${value === 'on' ? 'OPEN' : 'CLOSED'}.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
