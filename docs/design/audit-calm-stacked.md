# Design spec: "Calm and stacked" for adding a task (Time and energy audit)

Design 1 from the audit redesign. The approved mockup is the first phone, "Calm and stacked", at
https://claude.ai/artifact/XXVrroYtq3fFDhDwnnSc43 (private to the owner).

It's today's screen, tidied: the labels become questions, every option is visible without scrolling sideways, and the
buttons sit at the bottom. **Scope:** only the add-a-task form (`AuditScreen` in `mode === 'form'`). The routine list
(`mode === 'list'`), `AuditTaskCard`, the Routine tab and every other screen stay as they are. Light and dark both use
the theme tokens below. Nothing changes on the server.

## What the screen does (unchanged)

Everything on the current form stays: Step 2 of 4 header, the task name with "Task N", the 60-letter limit and the
counter near it, the "already in your routine" warning, quick picks for the role while the name is empty, Time
(`HOUR_OPTIONS`), Pay (`MONEY_LEVELS`, filling like a rating, with `MONEY_CAPTION`), Feel (Drains / Energizes), the
usual time as a dashed hint (`usualHours`), Save & next, Done · N, autosave, haptics, accessibility roles.

## Layout, top to bottom

```
‹  ▬▬ ▬▬ ▭▭ ▭▭                         StepHeader, as today
STEP 2 OF 4                            eyebrow
Time and energy audit                  title
( 3 tasks · 4.5 h a day )              totals pill (AuditStats), only when there are tasks

Social media|                 Task 4   the task name, big, one underlined line
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   (teal while typing)
 [+ Sales calls] [+ Team check-in] …   quick picks (only while the name is empty and focused)

How long, a day?
(30m) (1h) (1.5h) (2h) (3h) (4h)       time pills, wrapping onto a second line
(5h) (6h) (8h)
────────────────────────────────────   hairline
What does it pay?          Low value   caption of the current pick on the right
( $ )( $$ )( $$$ )( $$$$ )( $$$$$ )
────────────────────────────────────   hairline
How does it feel?
(  Drains  )      ( Energizes )

──────── pinned to the bottom ────────
[         Save & next  →          ]    full-width Button, disabled until all answers are in
         Done · 3 tasks ✓               quiet text button, centred, only when there's at least one task
```

### Header
- Keep `StepHeader` with eyebrow `Step 2 of 4` (or `Round N`) and title `Time and energy audit`. No subtitle.
- Under it, the existing `AuditStats` pill (`3 tasks · 4.5 h a day`) when `items.length > 0`, `spacing.md` below the title.

### Task name (as today, slightly bigger)
- One underlined line, no box: `borderBottomWidth: 2`, `colors.borderStrong`; `colors.primary` while focused,
  `colors.error` for a duplicate.
- Text 26, weight 800, letterSpacing -0.6, `colors.text`. Placeholder "Type a task" at the same size in
  `colors.muted`, 45% opacity.
- `Task N` on the right of the same line (12, weight 700, `colors.muted`), from the second task on.
- Input behaviour as today: multiline with no new lines, Return = done, `maxLength` 60, counter when ≥ 45, duplicate
  warning under the line, quick picks row under it while focused and empty.

### The three questions
Change `components/AuditChoices.js` from "label on the left, options on the right" to "question on top, options full
width under it". Keep its props (`item`, `onChange`) and all its option styles and behaviour.

Each question block:
- Question line: 14, weight 800, `colors.text`, sentence case (not uppercase). `spacing.sm` (8) above the options.
- Blocks are separated by a hairline (`1`, `colors.border`) with `spacing.md` (16) above and below it. No line after the last.

| Question | Right side of the question line | Options |
|---|---|---|
| How long, a day? | – | `HOUR_OPTIONS` pills, **wrapping** (`flexDirection: 'row'`, `flexWrap: 'wrap'`, gap 6), no horizontal `ScrollView`. Same pill: 36 tall, min width 48, pill radius, 1.5 `borderStrong` outline; picked = `colors.primary` fill, white text; usual time dashed in `colors.primary` |
| What does it pay? | the picked level's `MONEY_CAPTION` (13, weight 700, `colors.accentText`); before a pick, nothing | the five coins in one row (`flex: 1` each), exactly as today: fill up to the pick, gold gradient on the pick |
| How does it feel? | – | Drains / Energizes, two equal buttons (`flex: 1`, 40 tall) exactly as today: outlined in `colors.error` / `colors.success`, filled when picked |

### Footer (pinned to the bottom)
- Move `Save & next` and `Done` out of the scroll into a bar fixed at the bottom of the screen, like the list mode's
  `actionRow` (`paddingHorizontal: spacing.lg`, `paddingTop: spacing.sm`, `paddingBottom: spacing.md`, background
  `colors.background` so content scrolls under it).
- `Save & next`: full-width `Button` with `arrow-forward`, disabled until name + hours + money + energy are set
  (today's `ready`); it calls `formRef.current.save()` as now.
- `Done · N ✓`: text button centred under it (15, weight 800, `colors.primary`, `checkmark` icon), only when
  `items.length > 0`, `spacing.sm` above it.
- The keyboard still slides over the bottom (as today: nothing is lifted or resized). Keep the invisible spacer at
  the end of the scroll while the keyboard is up.

### Spacing
- Screen sides `spacing.lg` (24), as today. Between the totals pill and the task name `spacing.lg`; between the name
  (or the quick picks) and the first question `spacing.lg`.
- Leave room at the end of the scroll for the pinned footer so Feel is never hidden behind it.

## Files to touch
- `frontend/src/components/AuditChoices.js`: question on top, wrapping time pills, caption on the Pay line.
- `frontend/src/components/AuditForm.js`: name text 26 and the 2px underline.
- `frontend/src/screens/onboarding/AuditScreen.js`: totals pill under the header in form mode; Save & next and Done
  move into a bar pinned to the bottom.

## Check when done
- Add 3 tasks in a row with Save & next; pick a quick pick; try a duplicate name; reach the 60-letter limit.
- Save & next is grey until all three answers are in.
- Light and dark mode; a small phone (time pills wrap to two lines, nothing hidden behind the footer).
- Done opens the routine list as before; "See what drains you" still goes to the DRIP Matrix.
