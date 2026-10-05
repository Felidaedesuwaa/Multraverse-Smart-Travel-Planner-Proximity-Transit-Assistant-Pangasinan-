import { Router } from 'express'
import { AuditLog, BudgetEntry, Trip } from '../models'
import { authenticate, AuthRequest } from '../middleware/auth'
import { lguResources } from '../lib/lguResources'

const router = Router()
router.use(authenticate)
router.get('/', async (req: AuthRequest, res) => {
  const [security, expenses, trips] = await Promise.all([
    AuditLog.find({ targetUser: req.userId, action: { $in: ['password_changed', 'password_reset'] } }).sort({ createdAt: -1 }).limit(30).lean(),
    BudgetEntry.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(30).lean(),
    Trip.find({ userId: req.userId }).select('plan').limit(200).lean(),
  ])
  const referenced = new Set<string>()
  for (const trip of trips as any[]) {
    for (const stop of trip.plan?.guided?.stops || []) if (/^[a-f\d]{24}$/i.test(stop.entryId || '')) referenced.add(stop.entryId)
    for (const day of trip.plan?.days || []) for (const stop of day.stops || []) {
      if (stop.placeId) referenced.add(String(stop.placeId))
      for (const step of stop.transit?.steps || []) if (step.sourceId) referenced.add(String(step.sourceId))
    }
  }
  const notices: any[] = [
    ...security.map((event: any) => ({ id: `security:${event._id}`, type: 'password', title: 'Password changed', message: 'Your password was successfully changed. Wasn’t you? Verify your email to secure your account.', createdAt: event.createdAt, screen: 'PasswordRecovery' })),
    ...expenses.map((entry: any) => ({ id: `expense:${entry._id}`, type: 'expense', title: 'Expense added', message: `${entry.label} — PHP ${Number(entry.amount).toLocaleString('en-PH')} was successfully added to Budget.`, createdAt: entry.createdAt, screen: 'Budget' })),
  ]
  const reviewed = await Promise.all(Object.entries(lguResources).map(async ([resource, { model }]) => {
    const privileged = ['ADMIN', 'SUPERADMIN'].includes(req.userRole || '')
    const rows = await model.find({ submittedAt: { $exists: true }, ...(!privileged ? { $or: [
      { submittedBy: req.userId }, { approvalStatus: 'approved' }, { _id: { $in: [...referenced] } },
    ] } : {}) }).sort({ updatedAt: -1 }).limit(20).lean()
    return rows.map((row: any) => {
      const status = row.approvalStatus
      const owned = String(row.submittedBy) === req.userId
      const name = owned || privileged || status === 'approved' ? row.name || row.location || `${row.from || ''} to ${row.to || ''}` : 'Travel information in your saved trip'
      return { id: `review:${resource}:${row._id}:${row.reviewRevision || 0}:${status}`, type: 'review', title: status === 'pending' ? 'Review ongoing' : status === 'rejected' ? 'Review rejected' : 'Review approved',
        message: `${name}: ${status === 'pending' ? 'Admin review is ongoing' : status}${owned && row.rejectionReason ? `. ${row.rejectionReason}` : ''}.`,
        createdAt: row.reviewedAt || row.submittedAt || row.updatedAt, screen: owned ? 'LGU' : 'MyTrips' }
    })
  }))
  notices.push(...reviewed.flat())
  res.json(notices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 100))
})
export default router
