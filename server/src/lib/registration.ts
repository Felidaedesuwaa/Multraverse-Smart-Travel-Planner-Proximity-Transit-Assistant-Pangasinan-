export class RegistrationError extends Error {
  constructor(public fieldErrors: Record<string, string>, public status = 400) {
    super(Object.values(fieldErrors)[0] || 'Check your registration details')
  }
}

function normalizeName(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ')
}

function namePart(value: unknown, label: string, optional = false): string | null {
  if (typeof value !== 'string') return `${label} is required`
  const name = normalizeName(value)
  if (!name) return optional ? null : `${label} is required`
  if (name.length > 35) return `${label} must be at most 35 characters`
  if (!/^\p{L}[\p{L}\p{M}]*(?:[ '\u2019-][\p{L}\p{M}]+)*$/u.test(name)) return `${label} can contain letters, spaces, apostrophes and hyphens only`
  return null
}

export function registrationNameDetails(input: Record<string, unknown>) {
  const errors = Object.fromEntries(Object.entries({
    firstName: namePart(input.firstName, 'First name'),
    middleName: namePart(input.middleName ?? '', 'Middle name', true),
    surname: namePart(input.surname, 'Surname'),
  }).filter((entry): entry is [string, string] => entry[1] !== null))
  if (Object.keys(errors).length) throw new RegistrationError(errors)
  const firstName = normalizeName(input.firstName as string)
  const middleName = Array.from(normalizeName((input.middleName as string) || ''))[0]?.toLocaleUpperCase('en') || ''
  const surname = normalizeName(input.surname as string)
  return { firstName, middleName, surname, name: [firstName, middleName ? `${middleName}.` : '', surname].filter(Boolean).join(' ') }
}

export function registrationEmailError(email: unknown): string | null {
  if (typeof email !== 'string' || !email.trim()) return 'Email is required'
  const value = email.trim().toLowerCase()
  const parts = value.split('@')
  const [local, domain] = parts
  if (value.length > 254 || parts.length !== 2 || !local || local.length > 64 ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..') ||
    !domain || !domain.includes('.') || !domain.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) || !/[a-z]/.test(domain.split('.').slice(-1)[0])) {
    return 'Enter a valid email address, such as juan.delacruz@gmail.com'
  }
  if (['example.com', 'example.org', 'example.net', 'example', 'test', 'invalid', 'localhost'].some(blocked => domain === blocked || domain.endsWith(`.${blocked}`))) {
    return 'Use your own email address. Example and test domains are not accepted'
  }
  return null
}

export function registrationPasswordError(password: unknown): string | null {
  if (typeof password !== 'string' || !password) return 'Password is required'
  if (password.length < 8) return 'Password must be at least 8 characters'
  // bcrypt truncates after 72 bytes. The allowed character set is ASCII.
  if (password.length > 72) return 'Password must be at most 72 characters'
  if (!/^[A-Za-z0-9_@-]+$/.test(password)) return 'Use letters, numbers, _, - or @ only. Spaces and other symbols are not allowed'
  if (!/[A-Z]/.test(password)) return 'Include at least one uppercase letter'
  if (!/[0-9]/.test(password)) return 'Include at least one number'
  return null
}

export function registrationDetails(body: unknown): { name: string; email: string; password: string } {
  const input = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
  const errors = Object.fromEntries(Object.entries({
    firstName: namePart(input.firstName, 'First name'),
    middleName: namePart(input.middleName ?? '', 'Middle name', true),
    surname: namePart(input.surname, 'Surname'),
    email: registrationEmailError(input.email),
    password: registrationPasswordError(input.password),
  }).filter((entry): entry is [string, string] => entry[1] !== null))
  if (Object.keys(errors).length) throw new RegistrationError(errors)
  const { name } = registrationNameDetails(input)
  return { name, email: (input.email as string).trim().toLowerCase(), password: input.password as string }
}
