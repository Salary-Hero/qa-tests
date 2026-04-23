# Employee CRUD — API Contract

Base URL: `https://apiv2-{ENV}.salary-hero.com/api`

All endpoints require: `Authorization: Bearer {adminToken}`

See [shared/authentication.md](../shared/authentication.md) for how to obtain the token.

---

## Create Employee

**`POST /v1/admin/account/employee/{companyId}`**

**Request:**
```json
{
  "information": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "qa-signup-1745123456-abc123@test.example.com",
    "phone": "0912345678",
    "national_id": "1234567890123",
    "passport_no": "AB123456",
    "birthday_at": "1990-01-15",
    "status": "active",
    "is_blacklist": false,
    "salary": 30000,
    "salary_type": "monthly",
    "employee_id": "EMP17451234560001",
    "company_id": "128",
    "paycycle_id": 3661,
    "disbursement_type": "bank",
    "line_id": null,
    "site_ids": []
  },
  "address": {
    "street_address": "",
    "sub_district": "",
    "district": "",
    "province": "",
    "postcode": ""
  },
  "bank": {
    "bank_code": "014",
    "account_name": "QA Test Account",
    "account_no": "1234567890"
  }
}
```

**Response (201):**
```json
{
  "information": {
    "user_id": 1262839,
    "first_name": "John",
    "last_name": "Doe",
    "email": "qa-signup-1745123456-abc123@test.example.com",
    "phone": "0912345678",
    "status": "active",
    "employee_id": "EMP17451234560001",
    "company_id": "128",
    "paycycle_id": "3661",
    "salary": 30000,
    "salary_type": "monthly",
    "disbursement_type": "bank",
    "line_id": null,
    "created_at": "2026-04-21T08:30:00Z",
    "updated_at": "2026-04-21T08:30:00Z"
  },
  "address": { "user_address_id": "addr_xyz", "..." },
  "bank": { "user_bank_id": "bank_xyz", "account_verify": "pending", "..." }
}
```

**Status Codes:**
- `201` - Created
- `400` - Invalid data / missing required field
- `403` - Permission denied
- `409` - Duplicate `employee_id`, `phone`, or `email`

**Read-only fields** (returned in response, must NOT be sent in subsequent PATCH):
`user_id`, `created_at`, `updated_at`, `user_address_id`, `user_bank_id`, `account_verify`

---

## Update Employee

**`PATCH /v1/admin/account/employee/{companyId}/{userId}`**

Send **only writable fields**. Including any read-only field returns `403`.

**Writable fields (15 total):**

| Field | Type | Notes |
|-------|------|-------|
| `first_name` | string | |
| `middle_name` | string | |
| `last_name` | string | |
| `email` | string | Must be unique |
| `phone` | string | Must be unique within paycycle |
| `national_id` | string | |
| `passport_no` | string | |
| `birthday_at` | string | YYYY-MM-DD |
| `salary` | number | |
| `salary_type` | string | `monthly` / `daily` / `hourly` |
| `employee_id` | string | Must be unique within company |
| `company_id` | string | |
| `paycycle_id` | **number** | API returns as string — must send as number |
| `disbursement_type` | string | `bank` / `cash` |
| `status` | string | `active` / `inactive` |
| `is_blacklist` | boolean | |

**Request:**
```json
{
  "information": {
    "first_name": "Jonathan",
    "last_name": "Doe",
    "email": "qa-signup-1745123456-abc123@test.example.com",
    "phone": "0912345678",
    "salary": 30000,
    "salary_type": "monthly",
    "employee_id": "EMP17451234560001",
    "company_id": "128",
    "paycycle_id": 3661,
    "disbursement_type": "bank",
    "status": "active",
    "is_blacklist": false
  },
  "address": { "street_address": "", "..." },
  "bank": { "bank_code": "014", "account_name": "QA Test Account", "account_no": "0987654321" }
}
```

**Response (200):** Same structure as create response, with updated values.

**Status Codes:**
- `200` - Updated
- `400` - Invalid data
- `403` - Read-only field included in request
- `404` - Employee not found
- `409` - Unique constraint violation

---

## Delete Employee

**`DELETE /v1/admin/account/employee/{userId}`**

No request body required.

**Response (200):**
```json
{ "message": "Employee deleted successfully" }
```

**Status Codes:**
- `200` - Deleted
- `403` - Permission denied
- `404` - Employee not found

**Cascading deletes** (backend handles automatically):

| Table | FK Column |
|-------|-----------|
| `employment` | `legacy_user_id` |
| `user_identity` | `legacy_user_id` |
| `user_balance` | `user_id` |
| `user_address` | `user_id` |
| `user_bank` | `user_id` |
| `users` | `user_id` (primary) |

---

## Error Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```
