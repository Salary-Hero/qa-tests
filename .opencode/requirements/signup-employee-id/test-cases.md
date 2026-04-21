# Signup: Employee ID — Test Cases

Test file: `api/tests/signup/signup-employee-id.test.ts`
Run: `npm run test:api -- api/tests/signup/signup-employee-id.test.ts`

Both tests share the same `runSignupFlow()` helper — the only difference is the identity value passed to the lookup step.

---

## TC-SIGN-003 · Employee ID Signup — National ID

**Priority:** High | **Status:** ✅ PASS | **Line:** `:152`

**Preconditions:**
- Seeded employee exists with generated `employee_id`, `national_id`, `phone`, `email`
- `OTP=123456`, `PINCODE=999999` set in `.env`
- `company_id = 128`

**Steps:**

| Step | Action | Expect |
|------|--------|--------|
| 1 | `POST /signup/employee-id/lookup` `{ employee_id, identity: national_id, company_id }` | 200, `is_signup: false`, `auth_challenge` returned |
| 2 | `POST /signup/employee-id/phone?action=request` `{ phone, auth_challenge }` | 200, `ref_code` returned |
| 3 | `POST /signup/employee-id/phone?action=verify` `{ phone, auth_challenge, verification: { ref_code, code: OTP } }` | 200, Firebase custom token returned |
| 4 | Firebase sign in with custom token | 200, `refreshToken` returned |
| 5 | Firebase refresh token (pre-PIN) | 200, `id_token` returned |
| 6 | `POST /signup/create-pin` `{ pincode: PINCODE }` | 200, `"Create PIN successfully"` |
| 7 | Firebase refresh token (post-PIN) | 200, new `id_token` returned |
| 8 | `GET /signup/profile` | 200, `employee_id` matches, `has_pincode: true`, `signup_at` not null |
| 9 | `POST /signup/logout` (best-effort) | Any status |

**Pass when:**
```
step 1: body.is_signup = false
        body.verification_info.auth_challenge defined
step 6: body.message = "Create PIN successfully"
step 8: body.profile.employee_id = ctx.identifiers.employee_id
        body.profile.has_pincode = true
        body.profile.signup_at != null
```

**Fails if:**
- Lookup returns 404 — employee not seeded, or `national_id` doesn't match
- OTP verify returns 400 — check `OTP` env var
- Firebase `TOKEN_EXPIRED` — transient, re-run

---

## TC-SIGN-004 · Employee ID Signup — Passport Number

**Priority:** High | **Status:** ✅ PASS | **Line:** `:167`

**Preconditions:**
- Seeded employee exists with generated `employee_id`, `passport_no`, `phone`, `email`
- `OTP=123456`, `PINCODE=999999` set in `.env`

**Steps:** Identical to TC-SIGN-003 with one difference:

| Step | Difference |
|------|-----------|
| 1 | `identity: passport_no` instead of `identity: national_id` |

All other steps and assertions are the same.

**Pass when:**
```
step 1: body.is_signup = false  (with passport as identity)
step 8: body.profile.employee_id = ctx.identifiers.employee_id
        body.profile.has_pincode = true
```

**Fails if:**
- Lookup returns 404 — `passport_no` doesn't match employee record
- Passport format rejected (must be 2 letters + 6 digits)

---

## Shared Flow: `runSignupFlow()`

Both tests call:
```typescript
await runSignupFlow(request, ctx, ctx.identifiers.national_id!)   // TC-SIGN-003
await runSignupFlow(request, ctx, ctx.identifiers.passport_no!)   // TC-SIGN-004
```

The second argument is the `verificationIdentifier` passed to the lookup step. Everything after lookup is identical.
