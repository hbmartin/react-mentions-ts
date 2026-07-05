# Security Policy

## Dependency Alert Triage

Runtime dependency alerts must be fixed or tracked before release. Tooling alerts can be accepted only when the package is used by development, CI, or docs workflows and cannot enter the published library surface.

For each dependency alert:

1. Run `pnpm why <package>` from the root workspace.
2. Run `pnpm --dir docs why <package>` when the alert is in the docs lockfile.
3. Prefer an update, override, or replacement that keeps `pnpm fmt && pnpm lint && pnpm test && pnpm dupes` passing.
4. If no safer update exists, document why the package is dev/docs-only and why replacing it would be broader than the alert risk.

Current accepted tooling-only alerts:

| Package                   | Scope                     | Rationale                                                                                                                                                              |
| ------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `oxfmt@0.57.0`            | root dev formatter        | Latest published release; used only by `pnpm fmt`; not included in `files` or runtime imports. Revisit when a newer release is available or when migrating formatters. |
| `node-exports-info@1.6.2` | transitive dev dependency | Low-adoption signal only, pulled by `eslint-plugin-react`; replacing the lint plugin would remove useful analysis without reducing published runtime risk.             |
