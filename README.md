# RenewTrack Prototype

RenewTrack is a frontend-only clickable prototype for a UAE document expiry and renewal management service.

## Open it

Open `index.html` in a modern browser. It uses CDN versions of Chart.js and Lucide Icons, so an internet connection is recommended.

Demo login: `admin@renewtrack.ae` / `admin123`.

## Included flows

- Dashboard with expiry charts, live status calculation, follow-ups, and document alerts
- Company, customer, employee, document, calendar, renewal, follow-up, notification, reports, staff, and settings views
- Add Company, Add Customer, Add Document, Add Follow-Up, WhatsApp reminder, notification, renewal, CSV export, and reset flows
- LocalStorage persists login, records, notification read state, and renewal changes.

## Resetting the demo

Open **Settings** and use **Reset Demo Data**. This restores the original sample records; the login session remains active.

## Deployment

Upload the files to Vercel, Netlify, or GitHub Pages. No build process or backend is required.

## Note

This is a frontend prototype only. It does not send real reminders, upload files to a server, or provide production authentication.
