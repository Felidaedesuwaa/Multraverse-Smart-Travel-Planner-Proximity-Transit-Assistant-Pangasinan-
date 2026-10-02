import { Trip, User } from '../models'

export function explorerPeriods(now = new Date()) {
  const local = new Date(now.getTime() + 8 * 3600000)
  local.setUTCHours(0, 0, 0, 0)
  local.setUTCDate(local.getUTCDate() - (local.getUTCDay() + 6) % 7)
  const week = new Date(local.getTime() - 8 * 3600000)
  return { week, previous: new Date(week.getTime() - 7 * 86400000), now }
}

export async function explorerDashboard(search: string, skip: number, limit: number) {
  const { week, previous, now } = explorerPeriods()
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const searchStage = escaped ? [{ $match: { $or: [{ name: { $regex: escaped, $options: 'i' } }, { email: { $regex: escaped, $options: 'i' } }] } }] : []
  const [accounts, trips] = await Promise.all([
    User.aggregate([
      { $match: { role: 'EXPLORER' } },
      { $facet: {
        summary: [{ $group: { _id: null, total: { $sum: 1 }, verified: { $sum: { $cond: [{ $ne: [{ $ifNull: ['$emailVerifiedAt', null] }, null] }, 1, 0] } },
          newThisWeek: { $sum: { $cond: [{ $and: [{ $gte: ['$createdAt', week] }, { $lte: ['$createdAt', now] }] }, 1, 0] } },
          newLastWeek: { $sum: { $cond: [{ $and: [{ $gte: ['$createdAt', previous] }, { $lt: ['$createdAt', week] }] }, 1, 0] } } } }],
        matching: [...searchStage, { $count: 'total' }],
        users: [...searchStage, { $sort: { createdAt: -1, _id: -1 } }, { $skip: skip }, { $limit: limit },
          { $lookup: { from: Trip.collection.collectionName, let: { user: '$_id' }, pipeline: [{ $match: { $expr: { $eq: ['$userId', '$$user'] } } }, { $count: 'total' }], as: 'tripTotals' } },
          { $project: { name: 1, email: 1, role: 1, location: 1, createdAt: 1, emailVerifiedAt: 1, tripCount: { $ifNull: [{ $arrayElemAt: ['$tripTotals.total', 0] }, 0] } } }],
      } },
    ]),
    Trip.aggregate([
      { $lookup: { from: User.collection.collectionName, let: { user: '$userId' }, pipeline: [{ $match: { role: 'EXPLORER', $expr: { $eq: ['$_id', '$$user'] } } }, { $project: { _id: 1 } }], as: 'explorer' } },
      { $match: { 'explorer.0': { $exists: true } } },
      { $group: { _id: null, total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } } } },
    ]),
  ])
  const result = accounts[0] || {}
  return {
    users: (result.users || []).map(({ _id, ...user }: any) => ({ ...user, id: String(_id) })),
    total: result.matching?.[0]?.total || 0,
    summary: { total: 0, verified: 0, newThisWeek: 0, newLastWeek: 0, ...result.summary?.[0], totalTrips: trips[0]?.total || 0, completedTrips: trips[0]?.completed || 0 },
  }
}
