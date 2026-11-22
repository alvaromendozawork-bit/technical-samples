# Counterspin: a compact table-tennis design sample

Validune / Álvaro Mendoza · 22 November 2026 · Independent fictional sample

**Produced with AI. This is a design proposal, not shipped work, a tested game, or evidence of previous sports-game employment.** All characters and progression below are fictional. No client files, artwork or implementation are included. Values are initial hypotheses for playtesting, not measured balance results. This short sample demonstrates specification style; it is not the commissioned 10–20-page GDD.

## 1. Player promise and first playable

Win by reading the opponent's position, placing a controlled return, then taking a calculated risk. Spin should change the available return, while a readable contact cue explains misses. Do not make every shot a maximum-power timing challenge.

First playable: one table, fixed camera, two neutral characters, one AI difficulty, mouse/keyboard and controller. Implement one complete singles game before character progression or tournament structure. The physics system remains authoritative; design supplies shot intent and tunable limits rather than teleporting the ball to a target.

## 2. Match state and scoring contract

States: `Ready → ServeSetup → LiveRally → PointResolved → ScoreShown → ServeSetup`. A winning point branches to `GameResult`; pause freezes simulation and input timers. A point has a unique rally ID. Only the first terminal event for that ID can change the score, preventing a table collision and subsequent floor collision from awarding two points.

Proposed singles default: first to 11, requiring a two-point lead. A let repeats the same point without changing score or service. After each scored point, let `k = scoreA + scoreB`. For the **next** point, service alternates in blocks of two while `k < 20`, then every point. With player A serving first, select A when `floor(k / 2)` is even below 20; from 20 onward select A when `k - 20` is even. Otherwise select B. Evaluate the win condition before preparing another serve. These defaults must be reconciled with the project's existing rules specification.

Physics reports semantic events such as legal first bounce, net contact, out-of-bounds and missed return. A rules resolver determines the point winner. Do not classify every net contact as a lost point: serve lets and live-rally net contacts have different consequences. Preserve the final ball trajectory during a short score overlay; do not interrupt a rally because the UI anticipated a fault.

## 3. Controls: separate intention from execution

| Action | Mouse and keyboard | Controller |
| --- | --- | --- |
| Move along the baseline | A/D, optional assisted positioning | Left stick horizontal |
| Aim a return | Mouse on opponent's table plane | Right stick, bounded by a visible aim region |
| Set power and commit swing | Hold/release left button | Hold/release right trigger |
| Select spin | Q/E cycle flat, topspin, backspin | Left/right bumper |
| Pause | Escape | Menu button |

Hold builds power to a cap; continued holding does not stack more power. Release schedules the swing. The simulation reports actual paddle contact; the design must not promise contact merely because an input occurred. A contact-quality function uses timing error and reach. The same function applies to both devices. At an unreachable ball, show a reach warning; do not add an invisible successful return.

Initial experiment: normalize power to 0–1; low-risk placement occupies 0.35–0.65. Above 0.75, increase angular error rather than guaranteeing extra winning shots. Aiming near a sideline consumes safety margin. Topspin and backspin adjust bounded paddle/ball contact parameters supplied to physics; they do not override a landing result. Offer reduced-speed practice and independent camera/input sensitivity, without changing ranked difficulty mid-point.

Contact feedback distinguishes `early`, `late`, `out of reach` and `mis-aimed`. Show only the dominant reason immediately; an optional practice panel exposes timing and aim errors. These labels require telemetry from contact and landing events, not guesses from the score.

## 4. Opponents and character differences

AI reads a delayed observation buffer, chooses an intended return and executes through the same movement, reach and shot limits as the player. Difficulty changes reaction delay, placement error and shot selection. It must not change the ball after contact, secretly read uncommitted input, or force a miss because the player is ahead.

Starting hypotheses: relaxed AI observes at 180 ms delay with broad placement noise; standard at 120 ms; challenging at 80 ms with narrower noise. Use a seeded random stream in debug builds so a problematic rally is reproducible. Log intended target separately from actual landing: this distinguishes decision error from physics or animation defects.

Three sample archetypes illustrate a future roster: Mira has longer reach with slower recovery; Sol resets quickly but has less reach; Vale has a larger safe spin range with a lower power cap. Each receives one strength and one cost, with the neutral baseline always playable. These are examples, not a completed eleven-character roster. Defer full numerical differentiation until neutral-versus-neutral rallies are readable. Avoid changing table rules or contact eligibility per character.

## 5. Scope, progression and interface

Prototype gate: finish a full game, pause/resume safely, resolve boundary cases and explain a miss. A proposed version 1.0 then adds quick match, a small tournament and practice/tutorial, plus the agreed roster after feasibility review. Later candidates: online multiplayer, replay sharing and advanced character-specific animations. None is silently included in the prototype.

Unlock cosmetics and character sidegrades through completed matches and skill challenges, without purchasable stat advantages. Save unlocks after an acknowledged game result. Restarting a finished match must not award its reward twice. Start with a modest fixed reward; difficulty bonuses require an explicit rule and a locked starting difficulty.

Text flow: `Title → Mode → Character/Difficulty → Match → Result → Rematch / Menu`. Pause offers resume, controls and abandon confirmation. HUD contains score, service indicator and chosen spin; practice adds target and contact feedback. During a live rally, progression notices stay hidden. A disconnected controller pauses instead of losing the point automatically.

## 6. Tunables and acceptance examples

| Tunable | Initial hypothesis | Observation that changes it |
| --- | --- | --- |
| Score overlay | 0.8 seconds, skippable after input settles | Players lose the next serve or fail to read score |
| Contact cue window | ±75 ms reference window | Early/late feedback disagrees with recorded contact |
| High-power risk threshold | 0.75 normalized power | Maximum power dominates safe placement |
| Standard AI observation delay | 120 ms | AI returns unreachable balls or appears inactive |

Acceptance checks for the first playable:

1. At 10–10, the next two points use different servers; at 11–10 play continues; 12–10 ends once. A let at 10–10 preserves both score and next server.
2. Two terminal collision events with one rally ID award exactly one point. A duplicate result event awards no extra unlock.
3. Identical recorded shot intent yields the same result on mouse and controller when simulation state is identical. Device sensitivity does not change physical power limits.
4. A missed return exposes its recorded reason in practice. Pause/resume does not advance ball position or power charge while paused.
5. For a fixed debug seed and input recording, the opponent's decisions replay. AI reach remains within the same bounds as player reach.

Before a production GDD: confirm the actual contact API, rules ownership, animation constraints, camera, device targets and save format. Review this proposal against those constraints; it does not certify ITTF compliance or implementation readiness.
