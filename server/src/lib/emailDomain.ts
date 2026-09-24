import { Resolver } from 'node:dns/promises'
import { RegistrationError } from './registration'

type MailRecord = { exchange: string; priority: number }
type MailLookup = (domain: string) => Promise<MailRecord[]>
const noMail = 'This email domain does not accept mail. Check the spelling or use another email address'

async function queryMailRecords(domain: string, publicFallback = false): Promise<MailRecord[]> {
  const resolver = new Resolver({ timeout: 2500, tries: 1 })
  // Some local/VPN resolvers refuse MX queries. Use a public resolver only for
  // transport failures; never override an authoritative no-mail result.
  if (publicFallback) resolver.setServers(['1.1.1.1'])
  const timer = setTimeout(() => resolver.cancel(), 5000)
  try { return await resolver.resolveMx(domain) } finally { clearTimeout(timer) }
}

async function lookupMail(domain: string): Promise<MailRecord[]> {
  try { return await queryMailRecords(domain) } catch (error) {
    const code = (error as NodeJS.ErrnoException).code || ''
    if (!['ECONNREFUSED', 'ETIMEOUT', 'ESERVFAIL', 'EREFUSED', 'ECANCELLED'].includes(code)) throw error
    return queryMailRecords(domain, true)
  }
}

// DNS proves that a domain accepts mail, not that a particular mailbox exists.
// Mailbox ownership must be established separately through an emailed link/code.
export async function ensureEmailDomain(email: string, lookup?: MailLookup): Promise<void> {
  try {
    const records = await (lookup || lookupMail)(email.split('@')[1])
    // A null MX ('.' or an empty exchange) explicitly declares no email service.
    if (!records.length || records.some(record => !record.exchange || record.exchange === '.')) {
      throw new RegistrationError({ email: noMail })
    }
  } catch (error) {
    if (error instanceof RegistrationError) throw error
    const code = (error as NodeJS.ErrnoException).code
    if (['ENOTFOUND', 'ENODATA', 'EBADNAME'].includes(code || '')) throw new RegistrationError({ email: noMail })
    throw new RegistrationError({ email: 'Email domain could not be checked right now. Please try again shortly' }, 503)
  }
}
