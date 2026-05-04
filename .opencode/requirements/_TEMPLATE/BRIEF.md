# Feature Brief: <Feature Name>

Write your notes here in plain language — no required structure or format.
The AI will read this file and convert it into structured requirement docs.

---

## What this feature does

<!-- Describe the feature in plain language.
e.g. "HR admin uploads a CSV of employees. Each employee receives a consent request on their phone.
      They fill in a form and submit. HR admin reviews and approves or rejects." -->

## User flows

<!-- Step-by-step what the user or admin does.
e.g.
1. Admin logs in to admin console
2. Admin uploads CSV
3. System imports employees and sets consent_status = new
4. Employee opens mobile app and submits consent form
5. Admin approves the submission
6. consent_status changes to approved -->

## Business rules and edge cases

<!-- Any rules the API must enforce, or edge cases you know about.
e.g.
- Only employees with consent_status = pending_review can be approved
- Approving a non-existent user_id must return 404
- Bulk approval is not supported — one employee at a time -->

## Known API endpoints

<!-- If you know them — method + path is enough. Full request/response not required.
e.g.
POST /v1/admin/account/consent/approve/{userId}
GET  /v1/admin/account/consent/submissions -->

## Out of scope

<!-- Anything explicitly not being tested.
e.g.
- Rejection flow
- Email notifications
- UI/frontend -->

## Notes / open questions

<!-- Anything uncertain or that needs clarification before testing.
e.g.
- Does approval cascade to employment table?
- What is the expected consent_status after approval — "approved" or "active"? -->
