# Understanding AI itinerary storage

`plannerdrafts` contains one document per generated itinerary, owned by one user.
Generating again creates another document. Clicking Save creates a permanent
`trips` document containing the snapshot; it does not move or delete the draft.

## Readable fields in the original collection

Open `plannerdrafts` in MongoDB Table view. Each document now includes these
readable fields directly, alongside its full `plan` snapshot. There is no extra
collection or read-only view. The backend refreshes these fields whenever it
validates a draft for saving. For edits, use the application's workflow so the
summary and snapshot stay aligned; raw MongoDB edits do not run backend hooks.

| Field | Meaning |
|---|---|
| `destination` | Destination area ID; multiple legacy destinations are separated by `/`. |
| `tripDate` | Start date in YYYY-MM-DD format. |
| `days`, `travelers` | Trip duration and group size. |
| `budgetPHP` | Total group budget in pesos. |
| `estimatedMinPHP`, `estimatedMaxPHP` | Estimated group cost range. Legacy plans show their known total in both. Unknown charges are excluded. |

To migrate another deployment after building the server, run from `server`:

```powershell
node scripts/migrate-planner-draft-fields.cjs
node scripts/migrate-planner-draft-fields.cjs --apply --database=YOUR_DATABASE_NAME
```

The migration preserves itinerary snapshots, IDs, timestamps and expiry dates,
adds the summary fields to the existing validator and documents, and removes the
obsolete `plannerDraftTable` view if it exists. New plans use the same collection.
Restart the backend after deploying the updated model.

## Original collection fields

| Stored field | Meaning |
|---|---|
| `_id`, `userId` | Draft identity and owner reference. |
| `plan` | Embedded itinerary snapshot, not a reference to another collection. |
| `expiresAt` | TTL deletion date: current guided drafts last 365 days; older `/itinerary` drafts last 24 hours. Saved trips have a separate permanent lifecycle. |
| `createdAt`, `updatedAt` | Added automatically by Mongoose. |
| `__v` | Mongoose document revision metadata; not the itinerary format version. |

## Current AI itinerary: `plan.guided`

This is the complete snapshot used by the current AI Itinerary page and saved-trip
display. Use it for the full schedule, including food, lodging and transit.

| Field under `plan.guided` | Meaning |
|---|---|
| `request.areaId`, `date`, `startTime`, `days` | Selected destination and trip timing. |
| `request.tripTypes`, `activities`, `preferences` | Selected themes, activities and other preferences. |
| `request.travelerType`, `travelStyle`, `travelers` | Traveler grouping, pace and number of people. |
| `request.budget` | Total group budget in PHP. |
| `request.transportModes`, `returnToOrigin` | Transport choices and whether to include a return journey. |
| `request.fareInputs[]` | Per-mode fare inputs: `mode`, fare-table `tableId`, distance `km`, `rides`, manual `allowance`, and `referenceAccepted`. |
| `request.mealBudget` | Meal allowance per person per day. |
| `request.lodgingId`, `hotelRooms` | Selected accommodation ID and room count. |
| `stops[]` | Schedule entries: `day`, suggested `time`, `title`, explanatory `subtitle`, category `tag`, `price`, display `iconKey`, and optional catalog `entryId`. A null price means unknown, not free. Transit entries can have no catalog ID. |
| `foodOptions[]` | Additional food suggestions: catalog ID, name, description, location (`where`), listed average price and source. Not all options are scheduled. |
| `chosenIds[]` | Distinct catalog IDs used in the schedule; compared with recent plans to reduce repetition. These are provenance IDs, not necessarily MongoDB ObjectIds. |
| `breakdown` | Group allowances/estimates by category: Emergency, Transit, Attraction, Food, Shopping and Lodging. Absent categories need not have a stored key. |
| `estimated` | Maximum estimated group total; mirrors `costEstimate.max`. |
| `mealAllocation` | `mealBudget × travelers × days`; an allowance, not a restaurant quotation. |
| `costEstimate` | Detailed cost calculation, described below. |
| `budgetComplete` | False because the plan can still contain unknown charges. |
| `mode` | `model-assisted` when validated model ordering is used; otherwise `catalog`. The AI ranks catalog choices; the backend builds the plan. |
| `warnings`, `generatedAt` | Planning caveats and ISO generation timestamp. |

| Field under `costEstimate` | Meaning |
|---|---|
| `meals`, `emergency`, `entryFees`, `transportTotal` | Group meal allocation, emergency reserve, known attraction fees and transport estimate. |
| `lodging` | Optional hotel range with `min`, `max`, `nights`, `rooms` and an assumption `note`; null means no calculated hotel estimate, not a guaranteed free stay. |
| `transport[]` | Per-mode `rides`, `perRide`, group `total`, calculation `basis`, `note` and `source`. Unknown values may be null. |
| `min`, `max` | Group estimate range including the emergency reserve. |
| `perPersonMin`, `perPersonMax` | Group range divided by the traveler count. |
| `remainingMin`, `remainingMax` | Budget minus maximum/minimum estimate respectively. |
| `status`, `note` | `over-budget` when even the minimum exceeds budget, `may-exceed` when only the maximum exceeds it, otherwise `partial`. Partial does not mean all charges are known. The note explains assumptions. |

## Why the rest of `plan` looks repetitive

`plan.guided` was added inside the older planner envelope to keep saving and older
API consumers compatible. `plan.version` is the envelope format version (currently
1); `plan.generatedAt` is a Date; `plan.mode` maps guided `model-assisted` to
`hybrid` and guided `catalog` to `database`; `plan.narrativeStatus` stores the
guided mode. These are not extra AI generations.

`plan.request` adapts the request to the older format. For guided plans its
`origin` is a compatibility destination value, not a user-supplied starting
location. `plan.days[].stops[]` includes attractions only, with compatibility
duration and timing values; it is not the complete guided schedule.
`plan.localFoods`, `fareGuide`, `returnLeg`, `allocation`, `costs`, `warnings`, and
`omitted` support the older planner. In guided snapshots, `costs.knownTotal`
mirrors the maximum estimate but does not fully describe the guided emergency
reserve or unknown charges. Read `plan.guided.costEstimate` for guided budgets.
Do not add both sets of amounts together.

For a saved plan, check `trips.plan.guided` instead. `trips.plannerId` links back
to the generation using `USER_ID:DRAFT_ID` and makes repeated saves idempotent.
