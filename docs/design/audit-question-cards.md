# Design spec: "Question cards" for adding a task (Time and energy audit)

Design 2 from the audit redesign. The approved mockup is the second phone, "Question cards", at
https://claude.ai/artifact/XXVrroYtq3fFDhDwnnSc43 (private to the owner).

**Scope:** only the add-a-task form (`AuditScreen` in `mode === 'form'`). The routine list (`mode === 'list'`),
`AuditTaskCard`, the Routine tab and every other screen stay as they are. Light and dark both use the theme tokens below.
Nothing changes on the server.

## What the screen does (unchanged)

Everything on the current form stays: Step 2 of 4 header, the task name with "Task N", the 60-letter limit and the
counter near it, the "already in your routine" warning, quick picks for the role while the name is empty, Time
(`HOUR_OPTIONS`), Pay (`MONEY_LEVELS`, filling like a rating, with `MONEY_CAPTION`), Feel (Drains / Energizes), the
usual time as a dashed hint (`usualHours`), Save & next, Done · N, autosave, haptics, accessibility roles.

## Layout, top to bottom

```
‹  ▬▬ ▬▬ ▭▭ ▭▭                         (StepHeader, as today)
STEP 2 OF 4 · 3 TASKS, 4.5 H           eyebrow: step + totals in one line
Time and energy audit                  title

┌──────────────────────────────────┐
│ TASK 4                           │   name card
│ Social media|                    │
└──────────────────────────────────┘
 [+ Sales calls] [+ Team check-in] …   quick picks (only while the name is empty and focused)

┌──────────────────────────────────┐
│ ⏱  How long, a day       1h  ✓  │   answered: folded to one line
└──────────────────────────────────┘
┌──────────────────────────────────┐
│ $  What it pays  $$ · Low value ✓│   answered: folded
└──────────────────────────────────┘
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ⚡ How it feels                   ┃   open: the one question being answered
┃ ( Drains )      ( Energizes )     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

      [ Save & next ]                  disabled (grey) until all three are answered
       Done · 3 tasks ✓                quiet text button, only when there's at least one task
```

### Header
- Keep `StepHeader`. Eyebrow becomes one line with the totals: `Step 2 of 4 · 3 tasks, 4.5 h` (no totals when there
  are no tasks yet: just `Step 2 of 4`). Use `formatHours`. Round mode keeps `Round N` as today.
- Title: `Time and energy audit`. No subtitle.

### Name card
- White card: `backgroundColor: colors.surface`, `borderWidth: 1`, `borderColor: colors.border`,
  `borderRadius: radius.md` (16), padding 12 vertical / 14 horizontal. Teal border (`colors.primary`, 1.5) while focused;
  `colors.error` when the name is a duplicate.
- Small label on top: `TASK 4` (12, weight 800, `colors.muted`, uppercase, letterSpacing 0.8). For the first task: `TASK 1`.
- The input under it: 20, weight 800, letterSpacing -0.4, `colors.text`. Placeholder "Type a task" in `colors.muted` at 45% opacity.
- Same input behaviour as today (`AuditForm`): multiline with no new lines, Return = done, `maxLength` 60, counter when
  ≥ 45, duplicate warning text under the card. Tapping anywhere on the card focuses the input.
- Quick picks: same horizontal row as today, under the card, only while focused and empty.

### The three question cards
One component, e.g. `components/AuditQuestionCards.js`, rendered by `AuditForm` in place of `AuditChoices`.
Props: `item` (`{ activity, hours, money, energy }`), `open` (`'hours' | 'money' | 'energy' | null`), `onOpen(field)`,
`onChange(patch)`.

| Card | Icon (Ionicons) | Icon tile background | Question | Folded answer |
|---|---|---|---|---|
| hours | `time-outline`, `colors.primary` | `colors.primarySoft` | How long, a day | `1h` in `colors.primary` |
| money | `cash-outline`, `colors.accentText` | `colors.accentSoft` | What it pays | `$$ · Low value` in `colors.accentText` |
| energy | `flash` / `battery-dead`, success / error | `colors.successSoft` / `colors.errorSoft` | How it feels | `Drains` in `colors.error`, or `Energizes` in `colors.success` |

Card styles:
- Base: `colors.surface`, `borderWidth: 1`, `borderColor: colors.border`, `borderRadius: radius.md`, padding 12,
  gap 10 between the header line and its options. Cards are 8 apart (`spacing.sm`).
- Header line: icon tile 30×30, radius 9, centred icon 16; question 14 weight 800 `colors.text`, `flex: 1`;
  answer on the right (13, weight 800) followed by an 18×18 tick circle (`colors.primary` fill, white `checkmark` 12).
- **Unanswered and closed:** header line only, no answer, no tick.
- **Answered and closed (folded):** header line with answer and tick; `borderColor: colors.primary`.
- **Open:** `borderWidth: 2`, `borderColor: colors.primary`, light shadow in light mode (`cardShadow`), no answer
  text in the header; the options show under it:
  - hours: the `HOUR_OPTIONS` pills, **wrapping** (`flexWrap: 'wrap'`, gap 6), not a sideways scroll. Same pill
    style as `AuditChoices` (36 tall, pill radius, `borderStrong` outline, selected = `colors.primary` fill, usual
    time dashed).
  - money: the five coins exactly as in `AuditChoices` (fill up to the pick, gold gradient on the pick), and the
    caption for the current pick centred under them (13, weight 700, `colors.accentText`); before a pick:
    "Tap to rate" in `colors.muted`.
  - energy: the two Drains / Energizes buttons exactly as in `AuditChoices` (outlined in their colour, filled when picked).

### Which card is open
- When the form starts (and after each Save & next), `open` is the first unanswered field: `hours`.
- Picking an answer sets it, gives the selection haptic, then (with `LayoutAnimation.Presets.easeInEaseOut`) folds that
  card and opens the next unanswered one. After the last one, all three are folded.
- Tapping a folded or closed card's header opens it (and closes the open one). Tapping the open card's header closes it.
- Choosing a quick pick or pressing Return in the name: open the first unanswered card (as `openFirstMissing` does today).
- Header lines are `Pressable` with `accessibilityRole="button"`, `accessibilityState={{ expanded }}` and a label such
  as `How long, a day: 1 hour` / `not answered`. Options keep `accessibilityRole="radio"`.

### Footer
- `Save & next`: the full-width `Button`, disabled until name + hours + money + energy are set (as today's `ready`).
  Keep it under the cards in the scroll, as today.
- `Done · N ✓` text button under it, right as today, only when `items.length > 0`.
- On save: success haptic, task joins the list, form resets, the hours card opens again, the name is cleared.

## Files to touch
- `frontend/src/components/AuditQuestionCards.js`: new, the three cards.
- `frontend/src/components/AuditForm.js`: the name becomes the name card; render `AuditQuestionCards` instead of
  `AuditChoices`; hold `open` in state (the existing `field` state can be reused).
- `frontend/src/screens/onboarding/AuditScreen.js`: the totals move into the `StepHeader` eyebrow in form mode.
- `AuditChoices.js` can stay for now (or be removed if nothing else uses it).

## Check when done
- Add 3 tasks in a row with Save & next; pick a quick pick; try a duplicate name; change an answer by tapping a folded card.
- Light and dark mode; a small phone (no option clipped; time pills wrap to two lines).
- Done opens the routine list as before; "See what drains you" still goes to the DRIP Matrix.
