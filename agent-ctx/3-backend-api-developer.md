---
## Task ID: 3 - Backend API Developer

### Files Created
- `/src/lib/auth.ts` — Password hashing (SHA-256), verification, token generation
- `/src/app/api/auth/register/route.ts` — User registration POST
- `/src/app/api/auth/login/route.ts` — User login POST
- `/src/app/api/auth/me/route.ts` — Current user GET (by token query param)
- `/src/app/api/divisions/route.ts` — Division CRUD (GET/POST/PUT/DELETE)
- `/src/app/api/clients/route.ts` — Client CRUD with monthly hour tracking
- `/src/app/api/tasks/route.ts` — Task CRUD with filtering and logged hours
- `/src/app/api/timer/route.ts` — Timer start/stop/query with duration calculation
- `/src/app/api/dashboard/route.ts` — Role-based dashboard (ADMIN/CAPTAIN/CREW)
- `/src/app/api/seed/route.ts` — Demo seed data (idempotent)
- `/src/app/api/users/route.ts` — User CRUD with role/division filters

### Key Design Decisions
- Simple token-based auth (token = user.id) for prototype
- SHA-256 password hashing via Node.js crypto
- Duration stored as Float (hours) calculated as (endTime - startTime) / 3600
- Monthly calculations use JS Date methods (first of month boundaries)
- All routes return consistent JSON with error objects
- Idempotent seed data creation
- DELETE endpoints have business logic guards (active timers, captain roles, etc.)

### Lint Status
All files pass ESLint with zero errors.
