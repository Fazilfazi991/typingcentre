# Branches Module

Branches are created beneath a visible company and have an organisation-plus-company foreign key. The database rejects cross-tenant company links, active duplicate codes inside one company, and customer branch/company mismatches. Archive sets `archived_at`; owners can read archived records only as required for archive mutation support.
