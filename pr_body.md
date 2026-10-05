## Problem

The `MarkdownRenderer.tsx` in `apps/web` used `rehypeRaw` to allow rendering of HTML within markdown. However, it lacked a sanitization plugin, creating a Stored Cross-Site Scripting (XSS) vulnerability if any malicious payload (e.g., `<script>` or `<img onerror=.../>`) was ingested via GitHub issues or issue bodies.

## Root cause

The `rehypePlugins` array only included `rehypeRaw`, rendering HTML directly as DOM elements without filtering unsafe tags or attributes.

## Solution

Installed and added `rehype-sanitize` to the `rehypePlugins` array immediately after `rehypeRaw`. This ensures all raw HTML elements are sanitized according to a safe schema (removing scripts, on-event handlers, etc.) before being rendered into the DOM.

## Files changed

- `apps/web/package.json`
- `apps/web/src/components/MarkdownRenderer.tsx`

## Tests executed

- `npm run build --workspace=apps/web` (Verified successful frontend build).

## Security impact

High. Closes a severe Cross-Site Scripting (XSS) vector in the frontend dashboard.

## Breaking changes

None. Legitimate markdown and safe HTML (like `<b>`, `<i>`) will still render properly, while dangerous payloads will be stripped.

## Deployment/migration requirements

None.

## Rollback considerations

If certain safe, rich HTML elements are stripped (e.g., custom iframes or svgs intended by users), a custom schema can be supplied to `rehype-sanitize`.

Closes #299
