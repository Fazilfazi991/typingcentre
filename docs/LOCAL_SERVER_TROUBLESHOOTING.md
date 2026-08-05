# Local Server Troubleshooting

## Symptom

The Next development server listened on port 3000 but stopped responding to browser and HTTP requests after an earlier interrupted QA run.

## Root cause and recovery

An orphaned `npm`/Next process tree was still bound to port 3000 and consuming sustained CPU. The workspace source and environment files were intact. The recovery stopped only that process tree, deleted the generated `.next` cache, and started `npm run dev -- -p 3000` again.

The fresh server returned HTTP 200 for `/login`. First visits to freshly compiled protected routes remained slow while Next compiled them; after compilation, authenticated dashboard and direct-URL checks completed normally.

## Remaining risk

The development server is usable but has slow first-route compilation in this local environment. Final build verification remains the stronger deployment check.
