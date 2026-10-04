# Repository Intelligence

Scout v2 is smart enough to figure out how to test your repository without you explicitly telling it.

## Auto-Detection

When an AI agent asks Scout to validate the codebase, Scout looks for an explicit `npm run scout:validate` script. If it doesn't find one, it falls back to intelligent auto-detection based on the repository's ecosystem:

| Ecosystem | Detection Trigger                        | Fallback Command |
| --------- | ---------------------------------------- | ---------------- |
| Node.js   | `package.json` with `test` script        | `npm test`       |
| Python    | `pytest.ini` or `pytest` in requirements | `pytest`         |
| Rust      | `Cargo.toml` exists                      | `cargo test`     |

> [!TIP]
> To override the auto-detection, simply add a `scout:validate` script to your `package.json`, or configure a custom validation script in your Scout settings.
