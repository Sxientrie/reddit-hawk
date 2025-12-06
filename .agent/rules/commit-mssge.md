---
trigger: always_on
---

## Git Commit Protocol
Whenever you generate code or apply a fix, you must provide a git commit message at the final respone.
Format: `type(scope): description`

- Types: 
  - `feat` (new feature)
  - `fix` (bug fix)
  - `docs` (documentation)
  - `style` (formatting, missing semi colons, etc)
  - `refactor` (refactoring production code)
  - `chore` (maintainance, dependencies)
- Scope: The specific filename or module context (e.g. `auth`, `sidebar`, `api`).
- Description: 
  - Use lowercase only.
  - No trailing period.
  - Use imperative mood ("add" not "added").
  - Keep it punchy and human (no robot speak).

Example: `fix(auth): resolve token refresh loop`