# Typing Centre CRM sales walkthrough

Open `http://localhost:3000/demo` on the local production build. Demo Mode signs in to a fictional shared workspace. The sample records may be reset, so use only the seeded Ahmed Hassan record for this walkthrough.

1. On **Typing Centre Overview**, point out Open Requests, Waiting for Documents, Ready for Collection, and Expiring in 30 Days. **Today's Work** shows Ahmed's missing Passport alongside the other action items. **Upcoming Renewals** shows the nearest document expiries.
2. Search for **Ahmed Hassan** and open his customer profile. Show his service history, existing document, follow-up, payment balance, and activity.
3. Open **Residence Visa Renewal** (`SR-000001`). Show the status pipeline, assigned staff, expected date, existing AED 300 payment, and the required-document checklist. Passport starts **Missing**.
4. Use **Upload / Quick Scan** on Passport, then **Review demo passport**. Explain that this is a labeled simulation: it creates fictional Passport metadata and marks the checklist item Received. It does not upload a file or run AI. Review the Passport number and expiry, then save.
5. Back on the request, confirm Passport is **Received**. Move the request through **Ready to submit** and **Submitted**. Add an application reference such as `APP-DEMO-001`, save it, and show the copy button.
6. Move to **Processing**. Record the AED 770 remaining payment, show the updated balance and payment history, then open the printable receipt.
7. Return to the dashboard to show the request in the live operational queue or open it from Service Requests. Move it to **Ready for collection**, then **Completed**.
8. In **Remember the next renewal**, save the fictional renewed Residence Visa with its future expiry. Open the document, its expiry month in Calendar, and **All future expiries** in Renewals. This demonstrates how completed work becomes a future customer action.

The real Quick Scan binary upload and AI extraction require R2 and Gemini credentials and remain unverified. Do not present the demo Passport simulation as a real upload or AI result.
