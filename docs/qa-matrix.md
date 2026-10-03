# FORGE automated QA matrix

The QA suite is deliberately layered so a cheap failure stops before expensive browser verification.

| ID | Critical flow | Verification | Suite |
|---|---|---|---|
| U-01 | Username minimum/maximum/character contract | Validation invariants | Vitest |
| U-02 | Adaptive difficulty | Streak, clamp and boundary invariants | Vitest |
| U-03 | Focus generator | One target, no duplicate target, multidimensional difficulty | Vitest |
| E-01 | Landing/home | Shell renders and five training routes are exposed | Playwright |
| E-02 | Focus | Start button enters the live game state | Playwright |
| E-03 | Control | Route and introductory contract render | Playwright |
| E-04 | Patience | Route and introductory contract render | Playwright |
| E-05 | Persistence | Route and introductory contract render | Playwright |
| E-06 | Consistency | Route and introductory contract render | Playwright |
| E-07 | Profile editing | Invalid one-character username is blocked in the UI | Playwright |
| E-08 | Privacy | Export/delete controls are visible and correctly gated | Playwright |
| E-09 | Event API | Anonymous ingestion is rejected with 401 | Playwright API |
| E-10 | Privacy export API | Anonymous export is rejected with 401 | Playwright API |
| E-11 | Privacy deletion API | Anonymous deletion is rejected with 401 | Playwright API |
| E-12 | Mobile shell | Core smoke suite runs on Pixel 7 Chromium | Playwright |

## Gate order

1. QA foundation — test runner/configuration exists and critical flows are mapped.
2. Type/build integrity — 'npm run typecheck' and 'npm run build' must pass.
3. E2E — Playwright smoke and API-boundary tests must pass.
4. Security — authentication, input bounds, headers and abuse controls are verified.
5. Responsive/mobile — desktop and mobile browser projects remain green.
6. Performance — add measured budgets after the first clean functional baseline.
7. Release gate — only a green CI run plus production verification can mark a release candidate.

## CI policy

The default CI job runs typecheck, unit tests and a production build on every push to main and every pull request.

Browser E2E is enabled by the repository variable FORGE_E2E_ENABLED=true and requires FORGE_BASE_URL plus the Clerk secrets needed by the deployed application. This avoids pretending that a browser test is meaningful when its production authentication environment is absent.

## Critical-flow rule

A new game, account feature, persistence feature, analytics event, privacy action or adaptive rule is not considered complete until its normal path, failure/recovery path and relevant boundary condition are represented here or in a more specific regression suite.

## Current known QA blockers

- next.config.ts still contains typescript.ignoreBuildErrors = true; the next gate must remove this only after the actual type errors are surfaced and fixed.
- GitHub Actions execution is not yet observable through the connected GitHub workflow-run surface.
- Vercel production verification is currently blocked by the connected Vercel account scope returning HTTP 403; this is an environment/authorization issue, not a test pass.
- Clerk-authenticated E2E account creation/sign-in still needs a dedicated test identity strategy before it can safely run in CI.
- Global username uniqueness must ultimately be enforced by the authenticated account service/database, not only by browser-local validation.

## Test design principles

- Prefer observable player outcomes over implementation details.
- Keep tests deterministic; do not assert random challenge content.
- Test invariants at the generator/engine layer and user journeys at the browser layer.
- Treat accessibility semantics (role, labels, live regions) as part of the contract.
- Keep mobile in the same regression suite instead of creating a separate late-stage manual pass.
- Never make a test depend on a real user's account or persistent production data.
