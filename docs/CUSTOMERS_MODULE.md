# Customers Module

Routes: `/customers`, `/customers/new`, and `/customers/[customerId]`. Customer lists mask passport and Emirates ID values and never place full values in URLs. Detail access is tenant-scoped by RLS. A branch requires a selected company, with the database enforcing that the branch belongs to the same tenant and company. Normal lists exclude archived customers.
