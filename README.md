# Data Room

A secure document repository: nested folders, versioned PDF uploads, viewing, search, and
read-only sharing by public link or per-user grant.

React SPA + Express API + PostgreSQL + private blob storage, deployed as two projects from a
single repository.

## Live

|     | URL                                       |
| --- | ----------------------------------------- |
| Web | https://data-room-app-api-qd45.vercel.app |
| API | https://data-room-app-api.vercel.app      |

The browser only ever talks to the web origin: the web project rewrites `/api/:path*` to the
API deployment, so `https://<web>/api/health` and `https://<api>/health` return the same
response.

## Stack

| Layer    | Choice                                                                                    |
| -------- | ----------------------------------------------------------------------------------------- |
| Frontend | React 18, Vite, TypeScript, Tailwind, shadcn/ui on Radix, TanStack Query / Router / Table |
| Contract | ts-rest + zod, shared by both apps as a workspace package                                 |
| Backend  | Express 4, TypeScript, layered feature modules with manual dependency injection           |
| Data     | PostgreSQL (Neon) with Prisma                                                             |
| Storage  | Vercel Blob, private store, browser-direct uploads through short-lived signed URLs        |
| Auth     | Email and password, JWT in an HttpOnly cookie                                             |
| Hosting  | Two Vercel projects from one repository                                                   |

## Getting started

### Prerequisites

- Node.js 24 LTS (the version is pinned in `engines`; installing anything else fails on purpose)
- npm 11 (ships with Node 24)

### Setup

```bash
git clone https://github.com/LesiaUKR/data-room-app.git
cd data-room-app
npm install
cp apps/api/.env.example apps/api/.env   # then fill in real values
npm run build
```

### Commands

| Command             | What it does                                                                          |
| ------------------- | ------------------------------------------------------------------------------------- |
| `npm run build`     | Builds the shared contracts package, then every workspace that defines a build script |
| `npm run typecheck` | Type-checks every workspace                                                           |
| `npm run lint`      | Lints the repository                                                                  |
| `npm run format`    | Applies the shared formatting rules                                                   |

A pre-commit hook checks staged files with ESLint and Prettier and type-checks the whole
repository. It never rewrites files: a commit that does not lint, match the formatting rules, or
compile is rejected.

## Repository layout

```text
apps/web/            React single-page application
apps/api/            Express API
packages/contracts/  Route definitions, schemas, and shared enums used by both
```

## Architecture

A request travels one path, and each layer has one job:

```text
browser → contract-typed client → /api rewrite → Express
        → middleware → controller → service → repository → PostgreSQL
```

Handlers do HTTP only. Services own the business rules and never see `req`/`res`.
Repositories are the only place the database is touched. Everything leaving a service is a
shaped DTO, never a raw row.

Express was chosen for the timebox, not for the architecture. The structure — one composition
root per feature module, constructor injection, validation declared in the contract, a single
error filter — is deliberately the one NestJS produces, so the decisions move across without
rework.

### Two entry points, one application

`src/app.ts` assembles Express and exports it, knowing nothing about how it will run.
`src/server.ts` adds `listen` and graceful shutdown for local development; on Vercel the same
exported application becomes a single function, because a serverless runtime has no
long-lived process to own a port. Graceful shutdown is therefore a documented no-op in
production, not dead code: the same file also has to work as an ordinary server.

### Deployment

Two Vercel projects deploy from one repository, with root directories `apps/api` and
`apps/web`. The web project rewrites `/api/:path*` to the API deployment **before** its
single-page-application catch-all, so API calls reach the API and a reloaded deep link still
serves `index.html` instead of a 404. Reversing those two rules would make the application
swallow its own API traffic.

Keeping both halves on one origin is a security decision, not a convenience: the session
cookie can stay `HttpOnly` with no CORS configuration and no credentials handling in the
client. Local development mirrors it — Vite proxies `/api` to the API dev server and strips
the prefix exactly as the production rewrite does.

The shared contracts package builds from its own `prepare` script, so a fresh `npm install`
produces it before either application compiles, both locally and during a deployment.

## Data model

_ERD and schema decisions._

## Design decisions

**The contract is a compile-time dependency, not documentation.** Routes, schemas, and error
codes live in one workspace package that both applications import. Rename a field and both
fail to type-check — the mismatch surfaces in a build, not in a user's browser. The cost is a
build step ordering constraint, solved by the package's `prepare` script.

**One origin instead of CORS.** The web project rewrites `/api/*` to the API deployment, so
the browser sees a single origin. That keeps the session cookie `HttpOnly` and removes CORS
and credentials handling from the client entirely. The cost is one rewrite rule whose order
matters, and preview deployments of the web app that point at the production API.

**One error shape, produced in one place.** Every failure returns
`{ error: { code, message, details? } }`. Services throw; a single middleware turns the throw
into a status. Clients branch on `code`, never on wording. Schema validation returns **422**;
input that is broken before a schema can run — malformed JSON — returns **400**; anything
unexpected returns a generic 500 with a request id and no internals.

**Redaction lives inside the logger.** A public-link token travels in the URL path, so the
request logger records the route template rather than the URL. Plain-object log payloads are
walked and credential-named keys are replaced at any depth, signed-URL queries and database
credentials are stripped from strings, and an error is reduced to type, message, and stack —
dropping whatever a library attached to it, such as the raw request body that a JSON parse
failure carries. No call site can forget to do this, because no call site does it.

**Uploads will bypass the API.** A serverless function accepts at most 4.5 MB of request
body, so file bytes must not pass through Express. The upload flow, which lands with the file
module, will hand the browser a short-lived URL signed for one pathname and one operation and
let it write straight to blob storage.

A probe against the real store settled one question early: a URL signed for
`application/pdf` accepted a `text/plain` body and overwrote the object, so the content type
embedded in a signature is experimentally a hint rather than a guarantee. The maximum size
carried in the same signature was not independently verified and is therefore treated the
same way. Both will be checked after the upload instead: the API asks storage for the
object's real size and content type and records those, never the values the client claimed. A
version becomes readable only once that check passes.

**The store is private and cannot be made public later.** Access mode is fixed when a Vercel
Blob store is created, and unguessable URLs are not access control for confidential
documents. Verified behaviourally: an unsigned request for a stored object's URL returns
`403`, while a signed one returns the bytes. The file module will authenticate reads and mint
short-lived download URLs per view.

## How it scales

### Total size and item count of a folder including its whole subtree

_Pending._

### What changes when one Data Room holds 100,000 files

_Pending._

### How sharing extends to per-user roles without remodeling

_Pending._

## Known gaps

Stated rather than hidden. Each is a decision with a reason, not an oversight.

- **The storage platform does not enforce the content type embedded in a signed upload URL.**
  A URL signed for `application/pdf` accepted a `text/plain` body and overwrote the object,
  despite the documented behaviour. The upload flow therefore treats that constraint as a
  hint and relies on its own post-upload verification of the stored object's real size and
  content type. Re-check when the platform behaviour changes.
- **Revoking a share does not invalidate an already-issued download URL.** A signed URL stays
  valid until it expires; the mitigation is a one-to-five-minute expiry, not a claim that
  revocation is instantaneous. Making it instant would mean proxying every file through the
  API and paying for that bandwidth.
- **Preview deployments of the web app call the production API,** because the rewrite target
  is a fixed URL. Acceptable while the project deploys only from `main`.
- **Graceful shutdown never runs in production.** A serverless invocation has no process to
  terminate. The code exists for the ordinary-server entry point and is a documented no-op on
  the hosting platform.

## Use of AI

_Where AI was used while building this, and where its output was rejected._
