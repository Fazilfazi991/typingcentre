# Branches Module

Branches are created beneath a visible active company and have an organisation-plus-company foreign key. Owners can create, edit and archive branches from the company detail surface.

The database rejects cross-tenant company links, active duplicate codes inside one company, and customer branch/company mismatches. Archive is soft-delete only: it sets `archived_at`, marks the branch inactive/removed, refreshes the parent company detail, and leaves related historical records retained.

Company detail filters branch rows with `archived_at is null` so archived branches are removed from the active branch list even though owner-only archived-record policies exist to support mutation completion.

Batch 5A browser sign-off passed for branch create, edit, archive, active-list exclusion, parent-company retention and cross-tenant branch edit URL protection.
