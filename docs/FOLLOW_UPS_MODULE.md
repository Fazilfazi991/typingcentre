# Follow-ups Module

Follow-ups belong to a customer and organisation. Owners can create them from a customer detail page or the `/follow-ups` workspace, edit pending due dates and notes, and mark them completed. Pending past-due items are displayed as overdue without changing their stored status. All mutations use the server-derived tenant context. The current schema has no company relation, response field or next-follow-up field; those need a future approved migration.
