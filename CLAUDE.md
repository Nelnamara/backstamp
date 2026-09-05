# Working rules for Backstamp

Binding. These exist because each one was earned by a real failure on this
project. Read before doing anything.

## 1. This is a native mobile app

The product is `mobile/` — Expo/React Native, run on a phone. It is **not** the
web app. `web/` exists, still works, and is **not the product**.

- Never call a web page an app.
- "Mobile" / "phone app" means a native build, verified on a device — never a
  responsive website.
- Nine days were burned building a desktop-shaped web app after a phone design
  was supplied on day one. Do not repeat this.

## 2. Never commit to `main`/`master`

Always branch. No exceptions, including for "small" or "already verified"
changes. Merge only when the owner says so.

Do not start a second branch that carries schema/migration changes while an
earlier one is still unmerged — two unmerged branches against one shared dev
database is a coordination mess the owner should never have to untangle.

## 3. Verification means the owner can check it

State plainly which of these applies to every claim:

- **Verified** — say exactly how (command run, endpoint hit, output seen).
- **Compiles / tests pass** — that is *not* "it works."
- **Unverified** — say so.

Never say something works because it should. If proof can't be put in the
owner's hands, label it unverified.

## 4. Verify from the right place

Checking a LAN address from the machine that hosts it proves nothing — it never
leaves the box. Firewalls, other devices, and real networks are the actual test.
Do not present a same-machine check as proof of external reachability.

## 5. Research before guessing versions or config

Look up primary sources (official docs, changelogs, the tool's own registry)
before pinning an SDK, choosing a version, or asserting how a tool behaves.
Two wrong Expo SDK guesses in a row wasted the owner's time; the answer was one
search away.

## 5a. The device is authoritative about the device

An error message from the phone beats any web search, changelog, or blog
post about what version a tool supports. Expo Go on this owner's phone
reports **SDK 57**; a search claiming the App Store was capped at SDK 54
sent the project through two wrong downgrades. If the device states a
version, that is the version.

## 6. Never run these on this project

- `npm audit fix --force` — it rolled React Native back four major versions and
  broke the whole install. The "vulnerabilities" it reports are dev build
  tooling that never ships to a phone. Ignore them.
- `expo install --fix` when the only complaint is patch-level drift.

## 7. Say what is NOT done

Every handoff lists the gaps alongside the wins — missing features, stubs,
things only partially wired. Do not let something look finished when it isn't.

## 8. Don't hand over blind commands

Run it here first where possible. When the owner must run something, make sure
the prerequisites actually hold (ports free, services up, permissions
available) before handing it over. Do not send them into an error you could
have predicted.

If a step needs Administrator or an account only they can create, say so up
front rather than after it fails.

**Test the exact command yourself first.** The execution-policy failure was
handed to the owner three times because it was never run here before being
sent. Running `powershell -Command "<the command>"` from the agent shell takes
seconds and catches it.

## 9. Design decisions are the owner's

Do not restyle or restructure a visible surface from your own taste. If a design
exists, build to it. If one doesn't, ask before inventing — don't present your
own invention as an option competing with what's already specified.

## 10. Be terse

Lead with the answer. Short paragraphs. No ceremony, no ranked "(Recommended)"
options, no narrating a flurry of tool calls. Build, verify, report what
happened in plain words.

---

## Environment facts

- Windows 11, PowerShell primary. Execution policy set permanently to
  `CurrentUser = Bypass` (2026-09-04). **`RemoteSigned` is NOT enough** —
  Node's `npx.ps1` is unsigned, so RemoteSigned still blocks it. Verified by
  running `npx expo --version` through PowerShell (returned 57.0.22).
  Never hand the owner a per-window `-Scope Process` bypass; fix it once.
- Python venv at `venv/`; `uvicorn` is not on PATH. Use
  `venv\Scripts\python.exe -m uvicorn`.
- Backend must bind `0.0.0.0` for a phone to reach it.
- Expo Go on the owner's phone runs **SDK 57**. The project matches (expo ~57).
- **Expo Go SDK 57 on iOS REQUIRES login** on BOTH the phone app and the CLI.
  "Just log out of Expo Go" is NOT a workaround — that changed in SDK 57.
  See https://expo.dev/changelog/expo-go-57-login
- `expo login -b` / `--sso` CRASHES on this machine: Expo's browser-opener uses
  `cmd /c start <url>` and the `&` in the OAuth URL breaks it. Use an access
  token instead: expo.dev > Access tokens, then `$env:EXPO_TOKEN="..."`.
  The owner signs into Expo with **Google SSO** — there is no password to type.
- Inbound firewall rules for ports 8000/8081 require Administrator.
