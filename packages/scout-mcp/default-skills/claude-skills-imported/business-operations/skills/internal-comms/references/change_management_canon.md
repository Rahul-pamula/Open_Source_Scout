# Change Management Canon

The seven foundational works on planned organizational change. The internal-comms skill is anchored on the first two (ADKAR + Kotter); the remaining five resolve specific failure modes the first two leave open.

---

## 1. Jeff Hiatt — _ADKAR: A Model for Change in Business, Government and Our Community_ (Prosci, 2006)

The five-stage individual-change model behind every Prosci diagnostic and the load-bearing reference for this skill. Each employee must move through:

- **Awareness** of the need for change
- **Desire** to support and participate in the change
- **Knowledge** of how to change
- **Ability** to implement the required skills and behaviors
- **Reinforcement** to sustain the change

ADKAR is **sequential**: a deficit at an earlier stage is the lead diagnosis for resistance at a later stage. If the team has Knowledge but no Desire, training will not help; you have an Awareness/Desire problem masquerading as a skills problem. The two most-skipped stages in real deployments are **Desire** (because it's emotionally uncomfortable to surface) and **Reinforcement** (because the comms team has moved on to the next change).

**Operational implication for internal-comms:** every touchpoint should be tagged to a specific ADKAR stage. The `comms_template_filler.py` tool enforces this.

Reference: Hiatt, Jeff M. (2006). _ADKAR: A Model for Change in Business, Government and Our Community_. Prosci Research.

---

## 2. John P. Kotter — _Leading Change_ (Harvard Business School Press, 1996)

The 8-step organizational-change model used by every executive sponsor since 1996:

1. Establish a Sense of Urgency
2. Build a Guiding Coalition
3. Form a Strategic Vision
4. Communicate the Change Vision
5. Empower Broad-Based Action
6. Generate Short-Term Wins
7. Sustain Acceleration
8. Anchor New Approaches in the Culture

Kotter's central thesis: change efforts fail in **predictable ways at predictable steps**. The most common failure is Step 1 (false urgency / no urgency) producing a guiding coalition (Step 2) that is too weak, which makes everything downstream impossible.

Kotter pairs _organizationally_ with Hiatt's _individual_ ADKAR: ADKAR diagnoses one person; Kotter diagnoses the org. The `change_announcement_builder.py` tool produces explicit Step 1–8 labeled output so reviewers can audit which steps are weak.

Reference: Kotter, John P. (1996). _Leading Change_. Harvard Business School Press.

---

## 3. William Bridges — _Managing Transitions: Making the Most of Change_ (Da Capo Lifelong Books, 1991; 4th ed. 2017)

Bridges distinguishes **change** (the external event — the re-org happens on June 1) from **transition** (the internal psychological adaptation — which takes weeks to months). Transition has three phases:

- **Endings** — letting go of the old role/team/identity
- **The Neutral Zone** — the disorienting middle, where productivity dips
- **Beginnings** — the new identity is internalized

Comms-implication: most announcements treat the change as a single date. The transition is not a date; it's a curve. The skill's 7-touchpoint calendar (T-3 through T+14) is designed to cover the front half of the Bridges curve, with the T+14 follow-up acknowledging the Neutral Zone.

Reference: Bridges, William. (1991, 4th ed. 2017). _Managing Transitions: Making the Most of Change_. Da Capo Lifelong Books.

---

## 4. Edgar Schein — _Organizational Culture and Leadership_ (Jossey-Bass, 1985; 5th ed. 2017)

Schein's three-level model of culture (artifacts → espoused values → underlying assumptions) explains why announcements that contradict underlying assumptions fail even when the espoused values support them. If the underlying assumption is "we never lay people off" and the announcement is a 30% RIF, no amount of vision-casting in Step 3 will repair the trust break.

Comms-implication: the magnitude validation in `change_announcement_builder.py` exists because _understated_ magnitude is the most common collision with underlying assumptions. Employees infer the assumption you're contradicting; you cannot hide it with adjective choice.

Reference: Schein, Edgar H. (1985, 5th ed. 2017). _Organizational Culture and Leadership_. Jossey-Bass.

---

## 5. McKinsey 7-S Framework (Waterman, Peters, & Phillips, 1980)

The 7-S framework lists seven interdependent organizational elements: Strategy, Structure, Systems, Shared Values, Style, Staff, Skills. Re-org announcements (the most common high-magnitude internal-comms event) typically change Structure but leave Systems, Style, and Staff alignment to chance — which is why the post-announcement 60-day window is the failure window.

Comms-implication: the "what stays the same" field in the announcement input is load-bearing. Saying _only_ what changes leaves employees inferring everything else changed too.

Reference: Waterman, Robert H., Thomas J. Peters, and Julien R. Phillips (1980). "Structure Is Not Organization." _Business Horizons_ 23 (3): 14–26.

---

## 6. Chip Heath & Dan Heath — _Switch: How to Change Things When Change Is Hard_ (Crown Business, 2010)

The "Rider / Elephant / Path" model: rational reasoning (Rider) is overruled by emotional reaction (Elephant) unless the environment (Path) is shaped to make the right behavior easy. Practical implication for internal-comms: **clarity beats motivation**. "Migrate your Confluence space by Oct 1 — here is the one-click migration tool" outperforms a motivational vision statement every time.

Comms-implication: the FAQ stage in `comms_template_filler.py` is "Path-shaping" work; it makes specific actions easy. The Knowledge ADKAR stage is _not_ the same as motivation — Heath would call it Path.

Reference: Heath, Chip, and Dan Heath. (2010). _Switch: How to Change Things When Change Is Hard_. Crown Business.

---

## 7. Patrick Lencioni — _The Advantage: Why Organizational Health Trumps Everything Else in Business_ (Jossey-Bass, 2012)

Lencioni's argument: organizational health (clarity, consistency, communication) is a more durable competitive advantage than strategy. He prescribes "over-communicate with relentless repetition" — the same message, in the same words, repeated until the leadership team is bored of saying it. Prosci's 5–7-touchpoint floor is the operational expression of Lencioni's discipline.

Lencioni also names "vulnerability-based trust" as the bedrock of healthy leadership communication. The skill's anti-pattern check on passive-voice accountability ("decisions have been made") comes directly from this: hiding the decision-maker is a vulnerability-avoidance move that costs more trust than it saves.

Reference: Lencioni, Patrick. (2012). _The Advantage: Why Organizational Health Trumps Everything Else in Business_. Jossey-Bass.

---

## Sources at a glance

| #   | Author(s)                | Work                                    | Year      | Used in                                      |
| --- | ------------------------ | --------------------------------------- | --------- | -------------------------------------------- |
| 1   | Hiatt                    | _ADKAR_                                 | 2006      | All tools — stage tagging                    |
| 2   | Kotter                   | _Leading Change_                        | 1996      | `change_announcement_builder.py`             |
| 3   | Bridges                  | _Managing Transitions_                  | 1991/2017 | `comms_calendar_builder.py` (T+14 follow-up) |
| 4   | Schein                   | _Organizational Culture and Leadership_ | 1985/2017 | Magnitude validation logic                   |
| 5   | Waterman/Peters/Phillips | 7-S framework                           | 1980      | "What stays the same" field                  |
| 6   | Heath & Heath            | _Switch_                                | 2010      | FAQ as Path-shaping                          |
| 7   | Lencioni                 | _The Advantage_                         | 2012      | Passive-voice anti-pattern check             |
