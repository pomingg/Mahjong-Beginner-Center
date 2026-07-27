# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

台灣麻將（16 張）出牌訓練工具 — React 18 + TypeScript + Vite, deployed to GitHub Pages at `/Mahjong-Beginner-Center/`. Deliberately avoids Japanese-riichi analysis jargon (向聽數、進張、兩面、嵌張、邊張) in anything user-facing; the `explain/` layer speaks only in terms of "聽牌" (tenpai) as the one concrete goal, in plain Taiwanese-table language. Those Japanese terms *do* appear as internal type/variable names in `handStructure.ts` (`TaatsuKind = 'ryanmen' | 'kanchan' | 'penchan' | 'pair'`) for developer precision — never let them leak into strings shown to the player.

## Commands

```bash
npm run dev         # vite dev server
npm run build        # tsc -b && vite build
npm run typecheck    # tsc -b --noEmit
npm run lint         # eslint .
npm run test         # vitest run (single pass, CI uses this)
npm run test:watch   # vitest watch mode
```

Run a single test file: `npx vitest run src/engine/__tests__/shanten.test.ts`. Run by name: `npx vitest run -t "pattern"`.

CI (`.github/workflows/`) runs typecheck → lint → test on every push/PR to `main`, then a separate workflow builds and deploys `dist/` to GitHub Pages on push to `main`.

Style is enforced by Prettier (no semicolons, single quotes, 100-col, trailing commas — see `.prettierrc`) and the ESLint flat config in `eslint.config.js`.

## Architecture

Three layers, strictly one-directional: **engine → explain → ui**. Engine code never imports from `explain/` or `ui/`; `explain/` never imports from `ui/`.

### `src/engine/` — pure game logic, no React

Tiles are represented as `TileKind = number` (0–33) and a hand as `HandCounts` — a fixed-length-34 array of per-kind counts (`createEmptyCounts`/`addTile`/`removeTile` in `tiles.ts`). Suit boundaries live in `constants.ts`: man 0–8, pin 9–17, tiao 18–26, honors 27–33. `NEEDED_MELDS = 5` (Taiwanese 16-tile rules: 5 melds + 1 pair = 17-tile win) is the one constant that would change for a different ruleset.

- **`shanten.ts`** — the core algorithm. Recursively decomposes each suit into Pareto-optimal `(melds, partials, hasPair)` combinations (dominated options pruned, memoized per-suit since all three number suits share structure), then folds the four suit results together and picks the cheapest completion cost. `-1` = complete hand. This is performance-critical and intentionally terse; don't "simplify" the dominance pruning without re-running the oracle cross-validation (see Testing below).
- **`ukeire.ts`** — for a given hand, which tile kinds would lower shanten by 1 if drawn, and how many of each remain (naively `4 - count in hand`, no tracking of other players' hands/discards).
- **`discardEvaluator.ts`** — `evaluateAllDiscards(hand)` tries discarding each tile kind present, computes resulting ukeire, and sorts best-first (lower shanten first, then more total ukeire, then — only when both of those are tied — safer per `discardSafety.ts`). This sorted array is the shared currency passed around the rest of the app — UI, explain text, and quality scoring all consume it.
- **`discardSafety.ts`** — `assessDiscardSafety(kind)`, a pure rank-based heuristic (`safe`/`medium`/`dangerous`, terminals+honors safest, 4/5/6 most dangerous) used only to break shanten/ukeire ties. There is no opponent or discard-river simulation anywhere in this codebase (`gameRound.ts` is explicit: single-player MVP, no 放槍/接炮) — this is deliberately *not* a real "will this deal in" calculation, just the same statistical rule of thumb a beginner is taught at the table. `DiscardEvaluation.safety` carries this, and it's what makes the classic "1234m, cut either end" case resolve to the terminal over the middle tile when they're otherwise perfectly tied.
- **`handStructure.ts`** — a *separate*, human-readable decomposition (`readHandStructure` → melds/taatsu/eye/floaters) used only for generating teaching text and highlighting, not for shanten math. It maximizes melds-then-taatsu-then-fewest-floaters, which is a different objective than the shanten DP, so don't assume the two decompositions agree tile-for-tile.
- **`handGenerator.ts`** — three ways to deal a hand, in increasing sophistication:
  - `dealNewRound()` — fully random 16 + shuffled wall.
  - `dealAtShanten(targetShanten)` — rejection-samples `dealNewRound` until shanten matches.
  - `dealHardQuestion(options)` — rejection-samples like above, but also scores each candidate with `questionFilter.ts` and keeps searching (up to `maxAttempts`, default 1000) until it finds a hand scoring `>= minScore`, gracefully falling back to the best-scoring attempt seen if none clears the bar. This is what the quick-training mode uses; the old full-round mode still uses `dealNewRound`.
- **`questionFilter.ts`** — quality scoring for "is this a good practice question" (0–10, via `assessQuestionQuality`): fewer floaters, more competitive same-shanten discards, wider ukeire spread between best/worst tied option, and a drawn tile that's actually relevant (`isRelevantDraw`) rather than a random dead tile. Exists specifically to avoid generating hands with obvious throwaway isolated tiles — see git history around "出題品質過濾" for the design rationale.
- **`gameRound.ts`** — state machine for the legacy full-round mode (`createRound` → `drawTile` → `discardTile` × up to `ROUND_MAX_DRAWS` → `won`/`drawn`). Records a `TurnRecord` per discard with `wasOptimal`/`keptShanten` flags for end-of-round stats.

### `src/explain/` — engine output → Traditional Chinese teaching text

- **`explainDiscard.ts`** — post-discard feedback comparing the player's choice to the best option (`explainDiscard`), plus the shared phrasing helpers `shantenToText` and `formatUkeireList` (which truncates long tile-kind lists to keep sentences readable).
- **`analyzeHand.ts`** — pre-discard narration (`analyzeHandBeforeDiscard`): what's already built, what to keep/cut and why, ending with which tiles are safe "obvious cuts" (`suggestedDiscardKinds` — tiles tied for best shanten *and* best ukeire). This suggestion function is also what used to drive the discard-hint rings in the UI; the quick-training screen no longer surfaces it (players are meant to judge for themselves there), but the legacy `DiscardTrainingScreen` still does.

### `src/ui/` — two independent training modes sharing components

`App.tsx` currently mounts only `QuickTrainingScreen`; `DiscardTrainingScreen` is still present, tested, and buildable but not wired into `App.tsx`. Don't assume dead code when touching it.

- **Quick-training mode** (`hooks/useQuickTraining.ts` + `screens/QuickTrainingScreen.tsx`): single question at a time — deal → player picks a discard → feedback → next. Difficulty is a small enum (`beginner`/`intermediate`/`hard`/`challenge`) mapped in `DIFFICULTY_CONFIG` to `{ targetShanten, minScore }` pairs fed into `dealHardQuestion`. No discard hints are shown during the choosing phase; during feedback the hand stays visible (non-interactive) with the tile the player chose marked, so they can cross-reference the explanation text against the actual hand.
- **Full-round mode** (`hooks/useTrainingRound.ts` + `screens/DiscardTrainingScreen.tsx`): the original mode — a whole round of up to `ROUND_MAX_DRAWS` draw/discard cycles ending in win or a draw, with aggregate stats (`optimalTurns`/`keptTurns`) and a `RoundSummaryModal`.
- **Shared components** (`ui/components/`): `Tile`/`Hand` (render a hand from `HandCounts`, with `suggested`/`discarded`/`highlighted` visual states), `DiscardFeedbackPanel`, `HandAnalysisPanel`, `RoundSummaryModal`, `NewRoundButton`. `Tile`'s `suggested` prop is still consumed by `DiscardTrainingScreen`; don't remove it while that screen exists even if quick-training stops passing it.

Styling is CSS Modules per-component, with shared tokens (colors, spacing, radius) in `ui/styles/variables.css` — use `color-mix(in srgb, var(--color-x) N%, ...)` for tints rather than hardcoding new colors.

## Testing

`shanten.ts` is cross-validated against an independent brute-force implementation (`__tests__/bruteForceShanten.ts`) over hundreds of random 16- and 17-tile hands, because the DP's per-suit decomposition + fold is a nontrivial optimization over a naive full-hand search — if you touch the pruning/folding logic, run this cross-validation, not just the fixed-hand unit tests. Other engine modules generally have both fixed-hand assertions and property-style checks (e.g. `dealHardQuestion` tests assert the returned hand always has the right shanten and tile count across repeated random draws) — prefer that mix over only asserting exact output for one hardcoded hand where the logic is randomized.
