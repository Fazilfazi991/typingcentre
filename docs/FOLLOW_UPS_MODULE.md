# Follow-ups Module

Follow-ups currently belong to a customer and organisation. Owners can create them from a customer detail page or the `/follow-ups` workspace, edit pending due dates and notes, and mark them completed. Pending past-due items are displayed as overdue without changing their stored status. All mutations use the server-derived tenant context.

The approved extension is prepared in `20260806195000_stage_5_follow_up_workflow_extension.sql`, but has not been applied remotely. It adds nullable company, customer-response, next-follow-up and creator references while preserving history. Application UI for those new fields must wait for manual SQL Editor application and verification.
