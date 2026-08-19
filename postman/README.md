# Postman collection

API checks for the Data Room API, runnable against either the local dev server or the
deployed one.

## Files

| File                                         | Purpose                               |
| -------------------------------------------- | ------------------------------------- |
| `DataRoom.postman_collection.json`           | The requests and their assertions     |
| `DataRoom.local.postman_environment.json`    | `baseUrl` → `http://localhost:3001`   |
| `DataRoom.deployed.postman_environment.json` | `baseUrl` → the Vercel API deployment |

**No credentials are stored here, and none should ever be added.** The session is an
`HttpOnly` cookie held by Postman's own cookie jar, so there is no token to paste into an
environment file. The account each run creates is equally disposable: its email carries a
timestamp and its password is generated in the first pre-request script, so nothing readable
in this repository can sign in anywhere.

That matters because a run against the deployed environment creates a **real owner account** in
the shared database. A password committed here would be a working production login. If a future
request needs a fixed credential, it belongs in a Postman environment kept out of version
control — never in these files.

## Running it

1. Import all three files (Postman → Import → Files).
2. Pick an environment in the top-right selector.
3. Start the API if testing locally: `npm run dev -w @data-room/api`.
4. Run the whole collection (Collection → Run) — **order matters**, see below.

## Order matters

The collection is numbered because several assertions depend on session state:

| Folder                     | Why it sits there                                                      |
| -------------------------- | ---------------------------------------------------------------------- |
| `00 — Health`              | Also generates the run's unique email and the oversized-body payload   |
| `01 — Unauthenticated`     | Must run while the cookie jar is empty, or `/auth/me` would answer 200 |
| `02 — Rejected input`      | Validation failures leave no state behind                              |
| `03 — Sign-up and session` | Creates the account; every later request depends on it                 |
| `04 — Conflicts`           | Needs the account to already exist                                     |
| `05 — Sign-in`             | Re-establishes the session and compares response times                 |
| `06 — Folders`             | Needs a live session; builds and tears down its own tree               |
| `07 — Files`               | Uploads through a signed URL, then completes and versions the document |
| `08 — Sharing`             | Public links, user grants, viewer limits, and revocation               |
| `09 — Sign-out`            | Ends the session; leaves the jar clean for the next run                |

**Sign-out stays last.** Every feature folder needs the session that `03`/`05` established, so
each new one is inserted _before_ it — not appended after.

A fresh address is generated on every run (`qa+<timestamp>@example.com`), because
`ivan@acme.example` and `maria@globex.example` already exist from the Issue 03 seed.

`06 — Folders` works only inside that run's own empty data room, using the `rootFolderId` that
sign-up captured. It creates `Financials`, `Financials/Q3` and `Legal`, then deletes the
`Financials` subtree, so it never touches the seeded rooms.

## The cookie-jar trap

Postman remembers cookies between runs. If a run is interrupted after sign-up, the next run
would start with a live session and `01 — Unauthenticated` would wrongly pass with `200`.

The first request in that folder clears the jar in its pre-request script. If Postman refuses
programmatic access, add the domain under **Cookies → Domains Allowlist**; the script logs a
message instead of failing the run.

## What this collection cannot check

By design — these need other tools, and they are covered in
`.docs/test-plans/04-authentication.md`:

- **row counts after a rejected sign-up** (proof the transaction rolled back) — Neon SQL editor;
- **log contents** (no password, token or cookie header) — the terminal running the API;
- **cookie flags as the browser sees them** — DevTools → Application → Cookies.

## Extending it

One folder per feature, numbered in run order, and always inserted **before** `Sign-out`. That is
how `07 — Files` and `08 — Sharing` were added, each pushing sign-out one number further down.

Keep the same shape: assert the status code, the error `code`, and the one invariant the request
exists to prove — not the whole response body.

The collection currently holds **138 requests and 292 assertions**.
