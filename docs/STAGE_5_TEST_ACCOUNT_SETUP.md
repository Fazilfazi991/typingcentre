# Stage 5 Fictional Test Accounts

Created in the Supabase Auth dashboard on 2026-08-05. Passwords are held only in the verification session and are not recorded here.

| Owner | Organisation | Workspace state |
| --- | --- | --- |
| Amina Kareem | Al Noor Typing Centre, Dubai / Al Qusais | active owner, primary owner, starter subscription, usage counter created by onboarding |
| Daniel Thomas | Smart Documents Services, Sharjah / Al Majaz | active owner, primary owner, starter subscription, usage counter created by onboarding |

Both profiles were provisioned by the deployed Auth trigger. Profile IDs equal Auth user IDs, emails match, full names were set through authenticated owner updates, and `platform_role` remains `none`.

Removal: delete these two clearly labelled fictional Auth users in Supabase Dashboard after the pilot; verify application-owned records are retained or removed according to the intended retention policy before doing so.
