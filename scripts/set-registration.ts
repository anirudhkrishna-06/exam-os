import { setRegistrationEnabled } from '../services/app-settings.service'

const value = process.argv[2]?.toLowerCase()
if (value !== 'on' && value !== 'off') {
  console.error('Usage: npm run enrollment:on | npm run enrollment:off')
  process.exit(1)
}

await setRegistrationEnabled(value === 'on')
console.log(`New user enrollment is now ${value === 'on' ? 'OPEN' : 'CLOSED'}.`)
process.exit(0)
