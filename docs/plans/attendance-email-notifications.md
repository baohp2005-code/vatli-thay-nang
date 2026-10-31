# Execution Plan: Attendance Email Notifications

Date: 2026-10-10

## Status

Active

## Outcome

After a class session ends, every student who belongs to that session receives
one email to their account address telling them their attendance result:

- present ("Có mặt") — with an extra line when they also filed an early-leave
  request;
- absent with permission ("Vắng có phép") — with the leave type and reason;
- absent without permission ("Vắng không phép").

Admins turn the feature on per class, can see the delivery status per session,
and can send or re-send manually.

## Context

- Attendance status rule (single source of truth):
  `../vltn-backend/src/attendance/attendance-stats.util.ts` — any attendance log
  for the class session = present; otherwise a leave request = on leave;
  otherwise absent once the session has ended.
- Per-session roster rule (enrollment window + "real data is never hidden"):
  `AttendanceService.getAttendanceSummary` in
  `../vltn-backend/src/attendance/attendance.service.ts`.
- A class session can have several attendance sessions; they expire by
  `closedAt` without any event; admins can edit attendance manually afterwards.
- Leave requests could still be created after the session ended (backend only
  locked updates); the frontend already hides the button.
- Mail: `../vltn-backend/src/mail/mail.service.ts` (Resend HTTP API,
  fire-and-forget, dev stub without API key).
- Queue: BullMQ on the VPS Redis (`appendonly yes`, `noeviction`), used by
  `../vltn-backend/src/users/bulk-sync.processor.ts`.
- Postgres is Neon; periodic DB polling must be avoided so it can scale to zero
  (see backend commit `e6a3ab4`).
- Resend free plan: 100 emails/day, 3,000/month, shared with activation and
  password-reset mail.

## Scope

In scope:

- Per-class switch `Class.attendanceEmailEnabled` (default off).
- Automatic send `ATTENDANCE_NOTIFY_DELAY_MINUTES` (default 30) after the class
  session's `endTime`, only for sessions that had at least one attendance
  session opened, scheduled as a BullMQ delayed job when attendance is opened.
- One `attendance_notifications` row per (class session, student) recording the
  status, leave reason and delivery result; `class_sessions.attendanceNotifiedAt`
  as the "already sent" claim.
- Admin endpoints to read delivery status (including students whose status
  changed after sending) and to send now / re-send failed / re-send changed.
- Reject leave-request creation after the class session ended.
- Frontend: class form switch, class info display, class-session email card,
  email column in the attendance table, help text.

Out of scope:

- Parent email addresses (no such field in the schema).
- Automatic correction emails after manual attendance edits.
- Teaching assistants sending emails.
- Unsubscribe/preferences per student.

## Approach

1. Prisma schema + hand-written migration.
2. `MailService.sendBatch` using `POST /emails/batch` (≤100 per call,
   `Idempotency-Key`), throwing on failure so BullMQ retries; HTML-escaped
   attendance template.
3. New `attendance-notifications` module: status computation, BullMQ processor
   (`schedule` → re-check → claim → build rows → batch send), admin controller.
4. Hooks: `openAttendance` schedules the job; leave-request creation is blocked
   after `endTime`; class DTOs/responses carry `attendanceEmailEnabled`.
5. Frontend actions/types, class switch, `AttendanceEmailCard`, table column,
   help page.

## Risks And Recovery

- Wrong "absent" mails if attendance was never opened → only sessions with an
  attendance session are scheduled/sent.
- Duplicate sends if a job runs twice → atomic claim on `attendanceNotifiedAt`
  plus per-row delivery status and Resend idempotency keys.
- Quota exhaustion blocking activation mails → feature off by default per class;
  429 marks rows FAILED without hammering; admins re-send later.
- Lost delayed job (Redis wiped) → manual "Gửi ngay" button.
- Recovery: the feature is inert until a class is switched on; switching it off
  stops further automatic sends. The migration only adds columns/tables.

## Progress

- [x] Backend schema + hand-written migration
  `20261010000000_attendance_email_notifications`.
- [x] Backend mail batch (`MailService.sendBatch`, classified
  `MailDeliveryError`) + HTML-escaped template.
- [x] Backend notifications module (service, processor, controller, DTO).
- [x] Backend hooks (open attendance, leave-request lock, class fields,
  student hard-delete cleanup).
- [x] Backend unit tests (util, template, service delivery/gates).
- [x] Frontend types + actions.
- [x] Frontend class checkbox + class info row.
- [x] Frontend class-session `AttendanceEmailCard` (details list instead of a
  table column).
- [x] Frontend help text (also removed the stale "Xác nhận" leave approval).
- [x] Static validation in both repos (lint, prettier, tsc, build, jest).
- [x] Hand-written migration matches `prisma migrate diff` from the `main`
  schema.
- [x] End-to-end run against a local Postgres + Redis (Docker Engine in WSL2
  Ubuntu; Resend dev stub).

## Decisions

- 2026-10-10: Send automatically 30 minutes after the session ends, plus manual
  send/re-send buttons.
- 2026-10-10: Enabled per class, default off.
- 2026-10-10: Manual edits after sending show a warning and a manual "re-send
  changed" action; no automatic correction mail.
- 2026-10-10: Block leave-request creation after the session ended.
- 2026-10-10: Recipient is the student's account email.
- 2026-10-10: ADMIN only for send/re-send.
- 2026-10-10: Present + early-leave request → "Có mặt" plus an early-leave line.
- 2026-10-10: The student FK on `attendance_notifications` stays RESTRICT and
  the hard-delete transaction deletes the rows explicitly, matching the
  existing "delete every owned table" pattern (and its spec) instead of a
  cascade.
- 2026-10-10: The automatic send time is `max(endTime, last attendance
  closedAt) + delay`, so attendance opened late through the API never gets
  reported while it is still open; manual send is also refused while an
  attendance session is open.
- 2026-10-10: No email column in `AttendanceSummaryTable` (sticky, dynamic
  columns); the email card lists failed/changed students instead.

## Rollout

1. Commit both repos on `feat/attendance-email-notification` (frontend: do
   not stage the local `additionalDirectories` line in
   `.claude/settings.local.json`; do include this plan file). Push and open
   PRs — backend first. Both CIs must be green.
2. Merge the backend PR → GitHub Actions builds the image and deploys to the
   VPS; the container entrypoint runs `prisma migrate deploy` against Neon.
   The migration is additive and the feature is off for every class, so the
   deploy is inert until a class is switched on. `ATTENDANCE_NOTIFY_DELAY_MINUTES`
   defaults to 30; add it to the `ENV_PRODUCTION` secret only to change it.
3. Check the backend: `/health` 200; container logs show the migration applied
   and "Resend mailer ready".
4. Merge the frontend PR → Vercel deploy.
5. Smoke test on production with ONE small class: Sửa lớp → tick "Gửi email
   kết quả điểm danh"; open attendance during a real session; ~30 minutes
   after it ends check the class-session card ("Đã gửi lúc …") and Resend
   dashboard → Emails. Watch the free-plan quota (100/day, shared with
   activation and password-reset mail).
6. Rollback: untick the class (stops automatic sends immediately). Reverting
   code is safe without touching the schema — the new columns/table are unused
   by old code.

## Validation

- Unit: status resolution (present / on leave / absent / present + early leave),
  roster filtering, HTML escaping.
- Static: both repos' CI commands.
- End-to-end: open attendance, check in some students, file leave for one, let
  the session end, observe one email per student (dev stub or
  `delivered@resend.dev`) and the admin card counts; edit attendance afterwards
  and re-send only changed students.

## Result

Static validation, 2026-10-10 (Node 22.23.3, pnpm 9.15.4, Windows):

- Backend: `prisma validate` OK; ESLint 0 problems; `tsc --noEmit` OK;
  Prettier check OK; Jest 5 suites / 48 tests pass (3 new suites); `nest build`
  OK.
- Frontend: ESLint 0 errors, 1 pre-existing `VideoPlayer` hook-dependency
  warning; `tsc --noEmit` OK; Prettier check OK; `next build` OK.
- Prettier was run with `--end-of-line auto` locally because Git for Windows
  checks files out with CRLF (`core.autocrlf=true`); CI on Linux sees LF.

End-to-end, 2026-10-10 — local Postgres 16 + Redis 7 (Docker in WSL2), all 26
migrations applied with `prisma migrate deploy` on an empty database, backend
from `nest build`, `ATTENDANCE_NOTIFY_DELAY_MINUTES=1`, no Resend key (dev
stub). A scripted API run passed 22/22 checks:

- class created with emails on; 3 students; session; 1-minute attendance;
  student 1 checked in, student 2 filed a leave request, student 3 absent;
- before the end: status scheduled, manual send rejected (400), students get
  403 on the status endpoint;
- the delayed job fired at the scheduled second, claimed the session and sent
  3 mails: "Có mặt" / "Vắng có phép" / "Vắng không phép";
- a leave request after the end was rejected (409);
- after a manual MARK_ATTENDED the status showed 1 changed student; "CHANGED"
  re-sent exactly one "Có mặt" mail and cleared the flag; a second "ALL" was
  rejected (409) and "FAILED" with nothing failed returned 400.

The admin class-session page (Next dev server) rendered the email card
("Đã gửi lúc … Đã gửi 3"). Not covered: delivery through the real Resend API
(needs a key; batching, quota and rejection paths are covered by unit tests).
