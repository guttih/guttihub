# Working on Guttihub Stream

## Project and sources of truth

Guttihub is a self-hosted IPTV app for browsing M3U playlists, playing and sharing live streams, downloading media, and recording immediately or on a schedule.

- Stack: Next.js 15 App Router, React 19, strict TypeScript, Tailwind CSS, HLS.js, NextAuth v5 beta, Prisma/PostgreSQL, and Bash/FFmpeg workers.
- Read `docs/development.adoc`, `docs/setup.adoc`, and `docs/scripts.adoc` alongside the relevant code. `package.json` defines the actual commands.
- Background: https://guttih.com/list/project-guttihub (historical project description).
- Older READMEs and the project page describe a database-free app. Current authentication uses PostgreSQL through `prisma/schema.prisma` and `src/lib/prisma.ts`; recording metadata and playlist caches remain file-based. Trust current code over historical descriptions.

## Code map

- `src/app/`: pages and API route handlers; `src/app/ClientApp.tsx` is the main client UI.
- `src/components/`: players, stream cards, recording/download monitors, shared UI.
- `src/resolvers/`: service lookup and orchestration for recordings, live streams, and downloads.
- `src/utils/fileHandler.ts`: canonical cache, job, work, media, and script path helpers.
- `src/utils/resolverUtils.ts`: status parsing, finalization, media moves, and cleanup.
- `src/utils/record/recordingJobUtils.ts`: active-job detection and monitor enrichment.
- `src/scripts/`: actual media workers, stop commands, scheduling, and system checks.
- `src/config/index.ts`: app settings and service/output-directory configuration.
- `src/auth.ts`, `src/lib/auth/`, `src/utils/auth/`, `prisma/`: authentication, policy, and database schema/migrations.
- `src/types/`: shared domain contracts; `types/` also contains ambient declarations.
- `test/`: Vitest tests and M3U fixtures.

## Recording and streaming lifecycle

1. `src/app/record/RecordForm.tsx` posts to `/api/record/schedule-org`. Despite its name, this is the current recording submission route.
2. `ScheduleResolver.scheduleRecording()` loads its parameters into a `RecordingJob`, writes metadata, and launches `record.sh` with an argument array for immediate recording. Scheduled jobs go through `src/utils/jobctl.ts` and `src/scripts/jobctl.sh` to the OS `at` scheduler.
3. The resolver currently requests HLS recording and MP4 output. `record.sh` also supports a TS capture path. It captures, packages, then re-encodes for optimization.
4. Workers append `KEY=value` entries to `.status` files. Repeated keys are expected: use the latest value when interpreting current status. Preserve values containing `=`. Normal recording stages are `recording`, `packaging`, `optimizing`, then `done`, with `stopped` and `error` alternatives.
5. `record.sh` reports completion to `/api/job/has-ended/[cacheKey]`. That route calls finalization and cleanup utilities to move the media and maintain metadata.
6. `/api/record/stop` delegates to `ScheduleResolver.stopRecording()` and `stop-record.sh`. In recording status files, `PID` is the wrapper shell; `FFMPEG_PID` is the background `setsid timeout` launcher. Verify process ownership and process-group behavior before changing signals.
7. `LiveResolver` and `live.sh` provide shared live HLS playback. This is a separate worker path from recording; do not assume changing `live.sh` fixes recording.

Jobs live in `.cache/recording-jobs/`, keyed by `cacheKey`; `recordingId` identifies the media job and related info artifacts. These identifiers are not interchangeable. Work and final media directories come from `src/config/output-dirs.json`: index 0 is work storage, index 1 is final media. Use helpers rather than hardcoding paths.

## Debugging recording failures

- Establish whether the failure affects recording now, scheduled recording, shared live playback, stopping, packaging, or final media playback.
- Trace one job through request, metadata, status, worker log, process exit, completion callback, and final output. Redact credentials from stream URLs and logs before sharing evidence.
- Verify writable work/media directories, free disk space, `BASE_URL` callback reachability, and FFmpeg codecs. Scheduled execution also needs `at`, `atq`, and a running `atd`; compare its working directory, environment, and timezone with interactive execution.
- Inspect service concurrency limits before opening additional upstream connections for playback or diagnosis.
- Prefer deterministic local media and temporary directories for reproduction. Mock process launch, scheduler operations, network requests, and filesystem boundaries as appropriate.
- Review observations from the initial code scan, not confirmed explanations of a user's particular failure:
  - `record.sh` enables `set -e` but uses a bare `wait $PID` before reading `$?`. A nonzero child exit can terminate the wrapper before exit-code handling, finalization, and the cleanup callback.
  - Recording HLS capture and optimization hardcode `libx264`; `live.sh` has separate encoder detection. An installation that supports live playback may still fail recording.
  - Immediate launch and stop return after detached process creation, so an API success does not establish worker success.
  - Scheduled commands are constructed as shell text. Check quoting for spaces, quotes, dollar signs, and backticks without executing untrusted input.

## Development and validation

- Use npm and preserve `package-lock.json`. `npm ci` installs dependencies; `npm run db:generate` generates Prisma client code when needed. The current postinstall only changes shell script permissions.
- `npm run dev`: local Next.js development server.
- `npm run test -- --run`: run Vitest once. Plain `npm test` invokes Vitest's default mode and may watch locally despite older docs saying otherwise.
- `npm run test:file -- test/path.test.ts`: focused verbose test run.
- `npm run lint`: configured ESLint check. Prefer this over the legacy `lint:next` script.
- `npx tsc --noEmit --incremental false`: type check without incremental build artifacts.
- `npm run build`: production build when relevant; requires the app's configured environment and service configuration.
- For Bash edits, run `bash -n` on changed scripts and use ShellCheck if available. Syntax checks alone do not validate FFmpeg commands or signal handling.
- Test behavior relevant to changes: parsing/status contracts, failure handling, stopping, scheduler arguments, and finalization. Report existing failures and environmental blockers separately from regressions. Documentation-only changes need no runtime test suite.

## Implementation conventions and operational care

- Follow neighboring code style. Use `@/` for imports from `src`, typed domain contracts, PascalCase components/types, and camelCase functions/variables. Component folders generally match component names.
- Keep filesystem, process, database, and credential handling on the server. Preserve existing authentication and role policy when editing routes; inspect access checks rather than assuming all APIs are protected.
- Prefer `spawn`/`execFile` with argument arrays. Where the scheduler requires shell text, use shell-safe quoting and validate inputs at the server boundary.
- Keep worker arguments, status keys, TypeScript types, parsers, and monitor UI consistent when changing their shared contract.
- Do not expose `.env*`, provider credentials, user/account data, or credential-bearing playlist URLs. `src/config/services.json` is ignored local configuration and may be missing from a fresh checkout; its import expects a service array. Do not invent production values.
- Preserve recordings, caches, job metadata, and database state during investigation. Do not run cleanup endpoints, database resets, migrations, production stop/restart commands, or deployment as routine verification.
- `npm run deploy` increments the package version and invokes remote deployment. Run it only for an explicitly requested deployment. Long-running workers and local files require a persistent server environment; do not assume generic serverless hosting supports them.
