# @m-rui/dsh-mate-companion

Persisto Mate — the AI companion with a body clock, real sleep, its own memory and feelings — as a
[DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness) bundle.

## Install

```sh
dsh plugin --profile <your-profile> add github:m-rui001/dsh-mate-companion
# or, from npm:
dsh plugin --profile <your-profile> add @m-rui/dsh-mate-companion
```

Then boot that profile. State lives beside the harness home (`$DSH_HOME` or `~/.dsh`) at
`agent/mate/` — separate from the pi-host companion's state, because a different host is a
different body.

## What it contributes

- **System prompt sections** — the cached identity/character/memory block and a volatile state
  block (clock, mood, drives, session log, reply lean) that re-renders on every assembly.
- **The kernel** — every inbound user message advances the affective state; offline time
  integrates in closed form and crosses real sleep windows; memory recalls, rehearses and
  consolidates; SPARK beliefs crystallise from recurring topics.
- **A waking heartbeat** — impulses the kernel decides are worth voicing are delivered as a queued
  follow-up message of their own turn, wrapped in a `<system-event type="mate-impulse">` envelope
  so they are never mistaken for the user's words.
- **Tools** — `mate_remember` (persistent memory), `mate_ponder` (private thought), `mate_debug`
  (full internal state).

## Known scope limits (v0.1)

- **No affect judge.** The judge is the only path that moves the companion's feelings, and it
  needs a side-channel LLM call; dsh (0.2.0-rc, alpha) exposes no documented plugin-facing
  completion API. Drives, memory, beliefs, the clock and the session log all work; feelings stay
  flat until the judge is ported. This will land when the harness documents a call API.
- No live sleep mode, dreams, or alarm tool yet — offline sleep is fully simulated by the kernel's
  catch-up, and the sleeping-hours impulse suppression still applies.
- To switch the companion's prompt language, write `{"version":1,"lang":"zh"}` to
  `agent/mate/lang.json` under the harness home.

Requires Node 22.19+/24 per the harness. The harness is a developer preview; its plugin surface
may change under us.
