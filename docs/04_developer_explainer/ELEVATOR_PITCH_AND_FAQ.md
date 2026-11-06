# The Developer Explainer & Verbal Scripts

Use this document when explaining Open Source Scout V2 to fellow engineers, hiring managers, open-source maintainers, or investors.

---

## 1. The 30-Second Elevator Pitch

> *"Open Source Scout V1 was a passive issue discovery dashboard. **Scout V2 is a fully autonomous open-source contributor.**
>
> Instead of dumping hundreds of thousands of code tokens into an LLM and hoping it doesn't hallucinate, Scout uses the **Model Context Protocol (MCP)** to isolate tasks in **Git worktrees**, surgically inspects only the 30–50 lines it needs on demand, and enforces **12 strict engineering skills**.
>
> It plans before touching code, proves its fix by writing failing tests that turn green, and uses an **Honest Stop** circuit breaker to stop burning tokens if it gets stuck."*

---

## 2. Tough Questions & Word-for-Word Answers

### Q1: "If you don't load the whole codebase into the context window, how can the LLM understand what to do? You have to burn tokens to give it context, right?!"

**Answer:**

> *"That's the context-stuffing myth! Think about how a human senior engineer works when they join a massive repo: they don't read all 500,000 lines of code before fixing a bug.
>
> They read the issue description, run `grep` or `ripgrep` for the error string, find the exact file, and read only the 30 lines around that function.
>
> Scout MCP gives the LLM active tools (`read_file` with byte ranges, `run_command` with search) so the prompt starts with just ~1,500 tokens. The agent surgically pulls in only the lines it needs, cutting token consumption by 90% and eliminating hallucinations."*

---

### Q2: "What is the difference between Scout V1 and Scout V2?"

**Answer:**

> *"V1 was 'Scout, don't code' — it found issues and helped you claim them via GitHub comments, but you had to do all the work yourself.
>
> V2 is 'Autonomous Contributor' — it takes the issue, spins up an isolated Git worktree, plans the architectural boundaries, writes a reproduction test, patches the code via MCP, runs the test suite, and opens a clean Pull Request."*

---

### Q3: "What prevents the AI from hallucinating or claiming it fixed something when it didn't?"

**Answer:**

> *"The Proof-of-Fix protocol (`scout-proof-fix`). The agent is forbidden from submitting a PR until it follows a strict Red-Green test cycle:
>
> 1. It must write a test reproducing the bug and prove the test fails (**Red**).
> 2. It applies the patch and proves the test now passes (**Green**).
> 3. It runs the entire repo's regression suite.
>    No passing tests = No Pull Request. Period."*

---

### Q4: "What happens when the agent gets stuck? Doesn't it loop forever and drain your API credits?"

**Answer:**

> *"That's what naive agents like AutoGPT do. Scout V2 has `scout-honest-stop`.
>
> If the agent runs into missing API keys, ambiguous specs, or fails tests 3 times in a row, it triggers an autonomous circuit breaker. It calls `mark_blocked`, prints an exact diagnostic of why it stopped, preserves the git worktree for human inspection, and immediately halts token spend."*

---

### Q5: "Why Git Worktrees? Why not just use normal git branches?"

**Answer:**

> *"Normal git checkouts overwrite your working tree and dirty your staging index. If an agent crashes or writes bad code, your local workspace is trashed.
>
> With Git Worktrees (`git worktree add`), Scout spins up an independent, parallel directory for each session. The agent operates in complete isolation without touching your main working directory or branch. If anything goes wrong, Scout simply deletes the worktree directory."*

---

### Q6: "Why not just use Cursor or Claude Code directly?"

**Answer:**

> *"Cursor and Claude Code are interactive developer assistants for humans typing at a keyboard. Scout V2 is an **autonomous asynchronous worker**.
>
> Scout discovers open-source issues matching your skill profile, claims them, runs in the background across isolated worktrees, and delivers verified PRs while you sleep, adhering to strict organizational skills (DB migrations, API contracts, and tamper guards)."*
