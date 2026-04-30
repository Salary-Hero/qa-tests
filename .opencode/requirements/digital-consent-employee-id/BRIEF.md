# Feature Brief: Digital Consent Employee ID Only

Write your notes here in plain language — no required structure or format.
The AI will read this file and convert it into structured requirement docs.

---

## What this feature does

Company authentication is Digital Consent
Screening by Employee ID
Employee Request form: First Name, Last Name, National ID/Passport, Phone number

Admin admin uploads a xlsx or csv of employees that contains employee ID screening e.g. EMP-01, EMP-02. then user need to register in application by submit employee ID screening first if it's existing in our system then they need to fill request form and input OTP then set pincode.

After signup successfully then consent status of the user will be pending_review (from new) and status should always "inactive". 

HR can do request new data if employee's request form is not correct. Employee can re-submit employee request form and wait HR to approve, change request, reject again.

HR also can reject this employee if HR not allow them to use application.

Once everything look good. Admin will import employee's data into SH system by xlsx, csv files. In the import option we called "Approval" instead of "Create". after that employee will be able to use SH service in the application.

## User flows

#### Approve Flow
1. Admin logs in to admin console
2. Admin uploads xlsx file contains screening data in Import > Employee Consent Menu
3. System imports employees and sets consent_status = new, status = inactive
4. Admin can see list of user under Employee > Approval tab
5. Employee opens mobile app and submits consent form
6. Admin uploads xlsx file contains employee data in Import > Employee Data menu and select Approval Action to approve users. (Refer postman collection step 15-21)
7. consent_status changes to approved, status changes to active
8. Admin shouldn't see approved user under Employee > Approval tab
9. Admin should see approved user under Employee > All Employee tab
10. User able to use our service e.g. withdraw

#### Request Update Data Flow
1. Admin logs in to admin console
2. Admin uploads xlsx file contains screening data in Import > Employee Consent Menu
3. System imports employees and sets consent_status = new, status = inactive
4. Admin can see list of user under Employee > Approval tab
5. Employee opens mobile app and submits consent form
6. HR check and see user data is incorrect. So the can do Request Change data in HR console of this user
7. consent_status changes to pending_update
8. User re-submit request form
9. consent_status changes to pending_review
10. HR confirm data is correct then send xlsx, csv file contain employee data to SH Admin.
11. Admin uploads xlsx file contains employee data in Import > Employee Data menu to Approval
12. consent_status changes to approved, status changes to active
13. Admin shouldn't see approved user under Employee > Approval tab
14. Admin should see approved user under Employee > All Employee tab
15. User able to use our service e.g. withdraw

#### Reject Flow
1. Admin logs in to admin console
2. Admin uploads xlsx file contains screening data in Import > Employee Consent Menu
3. System imports employees and sets consent_status = new, status = inactive
4. Admin can see list of user under Employee > Approval tab
5. Employee opens mobile app and submits consent form
6. HR reject this user
7. consent_status changes to rejected and status still inactive
8. User shouldn't be able to use EWA service in application

## Business rules and edge cases

- consent_status = new can't manually changed in Admin, HR Console
- consent_status = new will changes to pending_review after user successfully submit request form
- Admin, HR can update pending_review to disabled or pending_update manually
- Admin, HR can update disabled to pending_update manually
- Admin can import approval when consent_status is pending_review only

## Known API endpoints
- API Collection Name: "[E2E] Digital Consent Employee ID Only"
- Path: docs/postman.postman_collection.json

## Out of scope
- Rejection flow (Low priority)
- Change Request flow (Low priority)
- Email notifications
- UI/frontend

## Notes / open questions

Example Data:
Screening Data Import: .opencode/requirements/digital-consent-employee-id/sample/digital-consent-employee-id-import.xlsx
Approval Data Import: .opencode/requirements/digital-consent-employee-id/sample/digital-consent-employee-id-import-approval.xlsx
