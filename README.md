# Meeting Insights Generator

**StackUp November Coding Challenge — Theme: From Words to Worlds – Multimodal GenAI**

Turn a spoken meeting into a summary, action items, decisions, and a visual timeline — in the browser, with no API key, no account, and no audio leaving the device.

Live demo: open `index.html` (or serve the folder) → **“Try demo meeting (1 click)”** → **“Generate insights”**.

## What it does

| Input | Output |
|---|---|
| Live recording (Web Speech API) | Live transcript, speaker-tagged |
| Audio file (.mp3 / .wav / .m4a / .webm) | In-page playback + live dictation while it plays |
| Transcript file (.txt / .vtt / .srt / .md) | Parsed instantly |
| Pasted / typed text (`Speaker: words…`, optional `[00:12]` timestamps) | Parsed instantly |
| Built-in demo meeting | 1-click, no mic needed |

From that transcript it produces, locally in JavaScript:

- **Summary** — extractive, verbatim sentences (it quotes the meeting; it cannot invent a decision that was not said)
- **Action items** — owner (speaker) + due date, extracted from commitment language (`will / should / must / need to`) and date patterns
- **Key decisions** — sentences containing `decided / agreed / final decision / approved`
- **Who spoke** — word share per speaker, as bars
- **Timeline** — first sentence of each turn, timestamped where timestamps exist
- **Keywords** — frequency cloud, stop-words removed
- **Export** — one click to `.md` or `.txt` (full summary + actions + decisions + speakers + transcript)

## Modalities (3, all client-side)

1. **Speech → Text** — Web Speech API for live recording (Chrome / Edge, best on desktop). Audio files play back in-page for live dictation. `.vtt` / `.srt` transcripts are parsed locally.
2. **Text → Insight** — local extractive summarisation: sentence scoring on action verbs, decision words, dates, numbers, keyword density and speaker changes. No network call, works offline.
3. **Text → Visual world** — speaker-share bars, colour-coded timeline, and a keyword cloud rendered from the same transcript.

## How to run

No build step, no dependencies, no backend.

```bash
# Option A — just open it
open index.html        # or double-click index.html

# Option B — local server (needed for some browsers' mic permission flow)
python3 -m http.server 8000
# then open http://localhost:8000/
```

Tested: Node v24, Python 3.12. Live recording needs Chrome / Edge and a microphone; Demo / Paste / Upload work in any modern browser.

## Performance / accuracy — measured on the built-in demo

Demo transcript: **10 turns, 4 speakers, 202 words, 17 sentences.**

| Check | Result |
|---|---|
| `node test.js` | **ALL TESTS PASSED** (parse, analyse, VTT, empty input, Markdown export) |
| Analysis time (in-browser, demo) | < 50 ms typical — reported live in the UI (“Done in X ms”) |
| Summary | 5 sentences, all verbatim, includes “launch on 5 December” |
| Action items | 7 found, incl. “Arjun, you will own the checkout fix … by 28 November” and “I will confirm the approval timeline by 24 November” |
| Decisions | 3 found, incl. “Final decision — launch on 5 December, announcement on 1 December” |
| Speaker share | Priya 40%, Arjun 31%, Maya 18%, Sam 11% (sums to 100%) |
| Keywords | november ×7, december ×6, launch ×5 |

Accuracy notes, honestly:

- Summarisation is **extractive**, so precision on the demo is high — every summary sentence is a real meeting sentence. It will miss a point phrased very indirectly, and it will not infer an owner who was never named.
- Action detection requires a commitment modal (`will / should / must / need to`). That avoids false positives like “the fix is ready”, at the cost of missing vague actions (“someone should look at that” with no owner is still caught, owner = speaker).
- Speech recognition accuracy is the browser's Web Speech API accuracy — typically 90%+ in quiet English, lower with accents / noise. The app shows interim results in italics and only final results go into the transcript.
- No external model is called, so there is no API latency, cost, or hallucination from an LLM — the trade-off is no abstractive paraphrasing.

## Screenshots (what to capture for the submission)

1. **Hero + input** — the landing view with the three tabs (Record / Upload / Paste) and the “Try demo meeting” button.
2. **Demo transcript** — the 10-turn transcript loaded, with speaker names and timestamps.
3. **Insights** — the results pane: summary box, 7 action items with due-date pills, decisions, speaker-share bars (Priya 40%), timeline, keyword cloud.
4. **Mobile view** — same results pane stacked in one column (responsive grid collapses under 900 px).

Capture at 1280×800, PNG. No real people's audio is in the demo — all sample data is fictional.

## 1-minute video script (≤ 60 seconds)

Record a screen capture with voiceover. Suggested timing:

- **0:00–0:08** — “This is Meeting Insights Generator. I record a meeting — or upload one — and it turns words into a world I can act on.”
- **0:08–0:20** — Click **“Try demo meeting”**. Show the 10-turn transcript appearing. “No mic needed — the demo is built in.”
- **0:20–0:35** — Click **“Generate insights”**. Show the summary, then scroll to action items. “Seven actions, with owners and dates — Arjun, checkout fix, 28 November.”
- **0:35–0:48** — Show speaker-share bars and the timeline. “Who spoke, when, and the keywords — all from the same transcript, in under a second, with no server.”
- **0:48–0:58** — Click **“Export .md”**. “And it exports as Markdown, ready to paste into a doc or a ticket.” End on the hero.

Screen-record instructions:

- Chrome / Edge, 1280×800 window, mic on for voiceover.
- Use the built-in demo (no live mic needed for the transcript itself).
- Keep it under 60 seconds; export MP4, ≤ 50 MB for the StackUp form.

## Files

```
index.html   — UI: Record / Upload / Paste tabs, transcript, results pane
styles.css   — dark theme, responsive (1 column under 900 px)
app.js       — all logic: parseLines / parseVttSrt, analyse(), toMarkdown(),
               demo transcript, Web Speech recording, file handling, export.
               Core functions are also exported for Node (module.exports).
test.js      — node test.js — parse, analyse, VTT, empty input, Markdown export
README.md    — this file
```

## Submission checklist — the exact 3 steps for Vaibhav

1. **Push this folder to GitHub** — create a new public repo (e.g. `meeting-insights-generator`), push these files, and copy the repo URL. Do NOT use any other repo URL — this folder is the only source.
2. **Record the 1-minute video** — follow the script above, upload it (YouTube unlisted / Loom / Drive), and copy the link.
3. **Submit on StackUp before 25 Nov 2026, 12:00 GMT+8 (09:30 IST)** — open https://hackathon.stackup.dev/web/events/stackup-november-coding-challenge , fill in the repo URL + README link + video link (≤ 1 min), and submit. Winners announced 30 Nov.

Do not submit before step 1 is done — the form needs a real repo URL.

## Judging fit

- **Functionality (30%)** — 3 input modes, live recording, local analysis, export; demo works in 1 click with no mic.
- **UI (25%)** — dark, responsive, speaker bars / timeline / keyword cloud, clear 1-2-3 flow.
- **Docs (25%)** — this README, measured demo results, honest accuracy limits, video script, and a 3-step submission checklist.

---

*StackUp November Coding Challenge · 1–24 Nov hacking, submissions close 25 Nov 12:00 GMT+8, judging 25–29 Nov, winners 30 Nov · $700 total — 1st $250, 2nd $180, 3rd $130, 4th $80, 5th $60.*
