# Internal Communications Canon

Seven sources that anchor the _internal communications_ discipline distinct from external/marketing comms. The audience is employees; the goal is trust, comprehension, and behavioral change — not awareness or conversion.

---

## 1. Edelman Trust Barometer (annual, since 2001)

The Edelman Trust Barometer is the longest-running cross-industry measurement of stakeholder trust. The internal-comms-relevant findings repeat year over year:

- **"My employer" is the single most trusted institution** in every survey since 2018, ranked above government, media, and NGOs.
- **The most trusted source within an employer is the direct manager**, not the CEO.
- **Trust collapses fastest** when the obvious question is unanswered or when leadership voice is absent during a crisis.

Operational implication: the FAQ scaffolding in `comms_template_filler.py` is built to pre-answer the obvious questions. The manager_cascade touchpoint in `comms_calendar_builder.py` exists because the direct manager is the load-bearing channel, not the CEO email.

Reference: Edelman. _Edelman Trust Barometer_ (annual report). https://www.edelman.com/trust/trust-barometer

---

## 2. Gallup — _State of the American Workplace_ (2017, periodic updates)

Gallup's longitudinal employee-engagement research finds:

- Only ~33% of US employees are engaged at work; the remainder are either disengaged or actively disengaged.
- Engagement correlates most strongly with **"my manager talks to me about my progress"** and **"someone at work cares about me as a person"** — both manager-cascade dependencies.
- Communications cadence matters more than communications volume; _predictable_ cadence outperforms _frequent_ cadence.

Operational implication: the T-3 manager pre-brief and the T+14 follow-up in the comms calendar exist because Gallup's data shows cadence beats volume.

Reference: Gallup. (2017). _State of the American Workplace_. Gallup, Inc. https://www.gallup.com/workplace/238085/state-american-workplace-report-2017.aspx

---

## 3. Liz Wiseman — _Multipliers: How the Best Leaders Make Everyone Smarter_ (HarperBusiness, 2010; rev. 2017)

Wiseman distinguishes "Multipliers" (leaders who amplify their teams) from "Diminishers" (leaders who consume their teams' intelligence). The communications-relevant axis is the **Liberator vs Tyrant** axis: Multipliers create the safety for hard questions to be asked publicly; Diminishers create cultures where the real questions show up only in Slack DMs and Glassdoor.

Comms-implication: the Q&A thread in the comms calendar (T+1, sponsor responding live) exists to model the Multiplier-Liberator stance. If the sponsor cannot or will not respond publicly to hard questions, the announcement is incomplete.

Reference: Wiseman, Liz. (2010, rev. 2017). _Multipliers: How the Best Leaders Make Everyone Smarter_. HarperBusiness.

---

## 4. Stew Friedman — _Total Leadership: Be a Better Leader, Have a Richer Life_ (Harvard Business Review Press, 2008)

Friedman's "four-way wins" model (work, home, community, self) is built on a foundation of _honest communication of trade-offs_. The implication for change announcements: an announcement that ignores the work-life cost of a change (e.g., a re-org that increases on-call burden, a tool rollout that requires nights/weekends to learn) loses trust on the omitted dimension.

Comms-implication: the "what is not being said" forcing question in the skill's question library is a Friedman move — surface the trade-off, don't hide it.

Reference: Friedman, Stewart D. (2008). _Total Leadership: Be a Better Leader, Have a Richer Life_. Harvard Business Review Press.

---

## 5. Bersin (Josh Bersin / Deloitte) — Employee Communications Research (2015–2023)

Bersin's research into "high-performing communications organizations" identifies recurring practices:

- The 5–7 touchpoint floor for behavioral change is consistent with Prosci and is independently confirmed in Bersin data.
- **Segmented messaging** outperforms broadcast messaging by ~2× on retention metrics — the same message tailored per audience segment.
- **Two-way channels** (Q&A, office hours, manager 1:1) outperform one-way channels (email, Slack post) on trust metrics, especially for high-magnitude changes.

Operational implication: the audience-segments field in the comms-brief input is required, not optional. The T+1 Q&A touchpoint exists because Bersin's two-way-channel finding is robust.

Reference: Bersin, Josh, and Deloitte. (2015–2023). _High-Impact Employee Communications_ research series. Bersin/Deloitte. https://joshbersin.com

---

## 6. Mary Welch & Paul R. Jackson — "Rethinking internal communication: a stakeholder approach" (_Corporate Communications_, 2007)

The academic baseline reference for internal-communication taxonomy. Welch & Jackson define four internal communication "dimensions":

- **Internal line management communication** (manager-to-team)
- **Internal team peer communication** (peer-to-peer within team)
- **Internal project peer communication** (peer-to-peer across teams)
- **Internal corporate communication** (leadership-to-all)

Each dimension has different audiences, channels, trust dynamics, and failure modes. Most internal announcements default to the fourth dimension (corporate broadcast) and ignore the first (manager cascade) — which is the highest-trust channel. The skill's manager_cascade touchpoint is the Welch-Jackson first dimension made operational.

Reference: Welch, Mary, and Paul R. Jackson. (2007). "Rethinking internal communication: a stakeholder approach." _Corporate Communications: An International Journal_ 12 (2): 177–198. doi:10.1108/13563280710744847

---

## 7. International Association of Business Communicators (IABC) — _Code of Ethics_ + _Global Standard_ (1995, updated 2015, 2023)

IABC is the professional body for internal/corporate communicators. Its _Code of Ethics_ and _Global Standard_ set the floor for ethical practice:

- **Truthful and accurate communications** — no euphemism for layoffs ("right-sizing", "streamlining for impact" applied to a RIF is an IABC violation).
- **Two-way symmetric communication** as the goal (Grunig's excellence model) — broadcast is the floor, dialogue is the standard.
- **Confidentiality** and **conflict-of-interest** disclosure — relevant for acquisition announcements where comms is briefed under NDA.

Comms-implication: the magnitude/tone validation logic in `change_announcement_builder.py` is implementing the IABC truthful-and-accurate standard. The Code of Ethics is a useful escalation reference when a sponsor pushes for misleading framing.

Reference: International Association of Business Communicators. (1995, updated 2015, 2023). _Code of Ethics for Professional Communicators_ and _IABC Global Standard_. IABC. https://www.iabc.com/About/Purpose/Code-of-Ethics

---

## Sources at a glance

| #   | Author(s)       | Work                             | Year           | Used in                               |
| --- | --------------- | -------------------------------- | -------------- | ------------------------------------- |
| 1   | Edelman         | Trust Barometer                  | annual         | Manager-cascade as #1 trusted channel |
| 2   | Gallup          | State of the American Workplace  | 2017           | Cadence over volume                   |
| 3   | Wiseman         | _Multipliers_                    | 2010/2017      | Sponsor-led Q&A thread                |
| 4   | Friedman        | _Total Leadership_               | 2008           | "What's not being said" question      |
| 5   | Bersin          | Employee Comms Research          | 2015–2023      | 5–7 touchpoint floor + segmentation   |
| 6   | Welch & Jackson | Internal-comm taxonomy paper     | 2007           | Manager-cascade dimension             |
| 7   | IABC            | Code of Ethics + Global Standard | 1995/2015/2023 | Magnitude/tone validation logic       |
