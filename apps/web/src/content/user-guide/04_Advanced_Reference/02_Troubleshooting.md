# Troubleshooting & FAQs

### Q: Why do Git commands fail in GitHub Actions CI?

If you are running Scout's test harness in a CI environment, tests that spawn mock git repositories may crash with `Author identity unknown`. This is because CI runners do not have global git credentials configured. Ensure you run `git config user.name` in your setup step.

### Q: The CLI setup is timing out connecting to Supabase?

During the `npx open-source-scout setup` phase, the CLI applies database migrations. If your corporate firewall blocks port 5432 (Postgres), the connection will time out. Try running the setup script on a different network, or apply the migrations manually via the Supabase Dashboard SQL editor.

### Q: Does Scout v2 send my code to the cloud?

**Absolutely not.** Scout v2 (the MCP package) is 100% offline. It has zero cloud adapters, zero Supabase imports, and zero telemetry. All execution states are stored locally in `.scout-tmp/state.json`.
