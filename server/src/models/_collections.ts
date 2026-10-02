// The only persisted root entities. Value objects (budget preferences and plan
// days/stops) have schemas, but intentionally have no collection/model here.
export const collectionNames: Record<string, string> = {
  User: 'users', Phrasebook: 'phrasebooks', Trip: 'trips', BudgetEntry: 'budgetentries',
  SavedPlace: 'savedplaces', Place: 'places', LocalFood: 'localfoods',
  TransitRoute: 'transitroutes', RoutePrice: 'routeprices', Geofence: 'geofences',
  PendingRegistration: 'pendingregistrations', PlannerDraft: 'plannerdrafts',
  AuthLimit: 'authlimits', AuditLog: 'auditlogs', AISettings: 'aisettings', PasswordReset: 'passwordresets',
}
