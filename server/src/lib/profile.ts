import { registrationNameDetails } from './registration'

export const PROFILE_FIELDS = 'name firstName middleName surname email role location photo createdAt'
export const MAX_PHOTO_BYTES = 512 * 1024

type ProfileUpdate = { name?: string; firstName?: string | null; middleName?: string | null; surname?: string | null; location?: string; photo?: string | null }

export function profileUpdate(body: unknown): ProfileUpdate {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid profile details')
  const input = body as Record<string, unknown>
  if (Object.keys(input).some(key => !['name', 'firstName', 'middleName', 'surname', 'location', 'photo'].includes(key))) {
    throw new Error('Only name fields, location, and photo can be updated here')
  }
  const update: ProfileUpdate = {}
  if (['firstName', 'middleName', 'surname'].some(key => key in input)) {
    Object.assign(update, registrationNameDetails(input))
  } else if ('name' in input) {
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 80) {
      throw new Error('Name must contain 1 to 80 characters')
    }
    update.name = input.name.trim()
    // Older clients only send a full name. Clear stale structured fields.
    update.firstName = null; update.middleName = null; update.surname = null
  }
  if ('location' in input) {
    if (typeof input.location !== 'string' || input.location.trim().length > 120) {
      throw new Error('Location must contain at most 120 characters')
    }
    update.location = input.location.trim()
  }
  if ('photo' in input) {
    if (input.photo === null) update.photo = null
    // Stable built-in avatar IDs. Image uploads retain their existing format.
    else if (typeof input.photo === 'string' && /^travel:(0[1-9]|1[0-6])$/.test(input.photo)) update.photo = input.photo
    else {
      if (typeof input.photo !== 'string' || input.photo.length > Math.ceil(MAX_PHOTO_BYTES / 3) * 4 + 23) {
        throw new Error('Choose a photo smaller than 512 KB after resizing')
      }
      const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(input.photo)
      if (!match) throw new Error('Profile photos must be JPEG images')
      const bytes = Buffer.from(match[1], 'base64')
      if (bytes.length > MAX_PHOTO_BYTES || bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff || bytes.toString('base64') !== match[1]) {
        throw new Error('Invalid profile photo')
      }
      update.photo = input.photo
    }
  }
  if (!Object.keys(update).length) throw new Error('No profile changes provided')
  return update
}
