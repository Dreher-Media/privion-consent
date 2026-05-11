# Security policy

## Reporting a vulnerability

If you've found a security vulnerability in any `@privion-consent/*` package, please report it privately rather than opening a public issue.

**Preferred:** [GitHub's private vulnerability reporting](https://github.com/Dreher-Media/privion-consent/security/advisories/new) — opens a private advisory thread visible only to maintainers.

**Alternative:** email `tobias@dreher-media.de` with `[privion-consent security]` in the subject line.

Please include:

- The affected package and version (e.g. `@privion-consent/core@1.0.0`).
- A clear description of the vulnerability and the impact.
- A minimal reproduction (code snippet, repo link, or steps).
- Your assessment of severity if you have one.

We aim to acknowledge reports within 72 hours and to ship a fix within 14 days for high-severity issues. Lower-severity reports may take longer; we'll keep you posted in the advisory thread.

## Supported versions

Only the latest minor of each major is actively supported with security fixes. After v1.0:

- `1.x` — supported until `2.0` ships, then for 6 months after.
- `0.x` — unsupported. The `0.x` series predates the v1.0 hardening pass and does not receive security backports.

## Out of scope

The library implements the **mechanism** for consent collection, persistence, and propagation. It does not make legal determinations about what counts as valid consent in your jurisdiction. Misconfigurations that result in non-compliance (missing categories, wrong defaults, host-app bugs) are not security vulnerabilities — they're usage issues. See [SPECIFICATION.md §1](./SPECIFICATION.md#1-compliance-scope) for the split.

## Disclosure

We will publish a security advisory and a coordinated release once a fix is available. Reporters who follow this policy are credited in the advisory unless they request otherwise.
