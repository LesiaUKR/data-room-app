# Data Room

A secure document repository: nested folders, versioned PDF uploads, viewing, search, and
read-only sharing by public link or per-user grant.

React SPA + Express API + PostgreSQL + private blob storage, deployed as two projects from a
single repository.

## Live

|     | URL                |
| --- | ------------------ |
| Web | _not deployed yet_ |
| API | _not deployed yet_ |

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

_Added as the layers land._

## Data model

_ERD and schema decisions._

## Design decisions

_Why the notable choices were made, and what they cost._

## How it scales

### Total size and item count of a folder including its whole subtree

_Pending._

### What changes when one Data Room holds 100,000 files

_Pending._

### How sharing extends to per-user roles without remodeling

_Pending._

## Known gaps

_Deliberate omissions and their reasons._

## Use of AI

_Where AI was used while building this, and where its output was rejected._
