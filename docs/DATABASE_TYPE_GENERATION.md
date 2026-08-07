# Database Type Generation

The committed `src/types/database.generated.ts` remains a placeholder. The local CLI could not generate remote types because its account lacks Management API permission for project `swnuikslynuneucetjub`.

This remains a Stage 6 limitation. After the Stage 6 migration is manually applied, regenerate types before relying on strongly typed document/version queries.

After the owner authorises the CLI or supplies an approved access token outside Git, run:

```powershell
npx supabase link --project-ref swnuikslynuneucetjub
npx supabase gen types typescript --linked --schema public > src/types/database.types.ts
npm run typecheck
```

Alternatively, in the Supabase dashboard open the project API documentation/type generation interface, select `public`, copy its TypeScript output to `src/types/database.types.ts`, add a generated-file header, and run `npm run typecheck`. Do not hand-author the generated file or commit API credentials.
