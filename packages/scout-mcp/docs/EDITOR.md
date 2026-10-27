# Scout MCP Editor Guide: Optimal Patterns & Safety Guarantees

## 1. Overview

The `edit_file` tool in Scout MCP enables AI agents to perform surgical, exact, and safe text replacements within files in an isolated git worktree.

Unlike blunt whole-file overwrites (`write_file`), `edit_file` minimizes unintended side-effects, preserves existing comments and imports, and provides automated safety guardrails.

---

## 2. Tool Parameters

| Parameter     | Type            | Required | Description                                                                   |
| :------------ | :-------------- | :------- | :---------------------------------------------------------------------------- |
| `session_id`  | `string` (UUID) | **Yes**  | Active Scout session UUID.                                                    |
| `path`        | `string`        | **Yes**  | Relative path to target file within the worktree.                             |
| `search`      | `string`        | **Yes**  | The exact text segment to search for.                                         |
| `replace`     | `string`        | **Yes**  | The replacement text to insert.                                               |
| `replace_all` | `boolean`       | No       | When `true`, replaces all occurrences across the target scope.                |
| `start_line`  | `number`        | No       | 1-indexed starting line to constrain replacement.                             |
| `end_line`    | `number`        | No       | 1-indexed ending line to constrain replacement.                               |
| `dry_run`     | `boolean`       | No       | When `true`, computes diff and validates replacement without writing to disk. |

---

## 3. Core Safety Guarantees

### A. Ambiguity Detection & Multi-Match Rejection

- When `search` occurs multiple times across the target file, replacing without disambiguation could modify the wrong code block.
- By default, Scout MCP detects multiple matches and **rejects the operation with an `InvalidParams` error**:
  ```json
  {
    "error": {
      "code": -32602,
      "message": "Ambiguous match: found 3 occurrences of search string. Provide more context to make the match unique."
    }
  }
  ```
- To safely proceed:
  - Add 1-2 lines of surrounding context to `search`.
  - Or constrain the edit using `start_line` and `end_line`.
  - Or set `replace_all: true` if an intentional global rename is intended.

### B. Line-Range Bounded Edits

- When modifying large files with recurring patterns (e.g. repeated functions or boilerplate), pass `start_line` and `end_line`.
- The search and replacement will be strictly bounded within the specified range, leaving the remainder of the file untouched.

### C. Fuzzy Indentation & Whitespace Fallback

- If an exact character-for-character match fails (e.g., the LLM produced 2 spaces of indentation instead of 4, or altered tab characters), Scout MCP engages a fuzzy indentation fallback.
- It normalizes line-level indentation to locate the uniquely matching code block and cleanly substitutes the replacement.

### D. Automatic EOL & Unicode BOM Preservation

- **CRLF vs LF:** Scout MCP auto-detects whether the target file uses Windows CRLF (`\r\n`) or Unix LF (`\n`). Search and replacement strings are normalized to match, and the file's native line ending is preserved.
- **UTF-8 BOM:** If the file begins with a Byte Order Mark (`\uFEFF`), line 1 search matching is stripped of the BOM prefix and restored upon saving.

### E. Atomic Writes via Staging Files

- All disk writes use `writeAtomicFile`:
  1. Content is written to a temporary staging file (`.<file>.scout-tmp-...`).
  2. POSIX permissions and mode bits (e.g., `chmod 0755` executable scripts) are copied over.
  3. The file is atomically renamed over the target via `fs.rename`.
  4. If any error occurs, the temporary file is deleted and the target remains 100% untouched.

---

## 4. Response Payload & Diff Validation

Every successful edit returns a unified diff showing exactly what changed:

```json
{
  "message": "File edited successfully.",
  "diff": "--- a/src/service.ts\n+++ b/src/service.ts\n@@ -12,3 +12,3 @@\n-const PORT = 3000;\n+const PORT = 8080;\n"
}
```

### Dry Run Previews

Before applying high-risk or sweeping refactors, pass `dry_run: true`. Scout MCP will validate your search strings and return the calculated diff without writing anything to disk:

```json
{
  "message": "Dry run successful. No changes written to disk.",
  "diff": "--- a/src/app.ts\n+++ b/src/app.ts\n...",
  "dry_run": true
}
```

---

## 5. Recommended Patterns for AI Coding Agents

1. **Include Surrounding Context:** Include 1-2 unchanged lines above and below your modification in `search` to guarantee uniqueness.
2. **Read Before Editing:** Always call `read_file` to fetch the freshest line numbers and exact code before executing `edit_file`.
3. **Verify Diffs:** Check the `diff` field in the response to confirm your edit executed as intended.
