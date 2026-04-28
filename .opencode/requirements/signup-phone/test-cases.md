# Signup: Phone — Test Cases

Test file: `api/tests/signup/signup-phone.test.ts`
Run: `yarn test:api --grep "Signup Phone"`

---

## TC-SIGN-001 · Phone Signup — Complete Flow

**Priority:** Critical | **Status:** ✅ PASS | **Line:** `:32`

**Preconditions:**
- Seeded employee exists with generated `phone`, `email`, `employee_id`
- `OTP` and `PINCODE` from `shared/fixtures/seed-config.json` (dev: `111111` / `999999`, staging: `199119`)
- Firebase API key configured in `.env` as `FIREBASE_API_KEY_DEV` / `FIREBASE_API_KEY_STAGING`

**Steps:**

| Step | Action | Expect |
|------|--------|--------|
| 1 | `POST /signup/phone/otp/request` `{ phone }` | 200, `is_signup: false`, `ref_code` returned |
| 2 | `POST /signup/phone/otp/verify` `{ phone, ref_code, code: OTP }` | 200, `is_signup: true`, Firebase custom token returned |
| 3 | Firebase sign in with custom token | 200, `refreshToken` returned |
| 4 | Firebase refresh token (pre-PIN) | 200, `id_token` returned |
| 5 | `POST /signup/create-pin` `{ pincode: PINCODE }` | 200, `"Create PIN successfully"` |
| 6 | Firebase refresh token (post-PIN) | 200, new `id_token` returned |
| 7 | `GET /signup/profile` | 200, `phone` matches, `has_pincode: true`, `signup_at` not null |
| 8 | `POST /signup/logout` (best-effort) | Any status — does not fail test |

**Pass when:**
```
step 1: body.is_signup = false
        body.next_state = "signup.phone.verify"
step 2: body.is_signup = true
        body.next_state = "user.profile"
step 5: body.message = "Create PIN successfully"
step 7: body.profile.phone = ctx.identifiers.phone
        body.profile.has_pincode = true
        body.profile.signup_at != null
```

**Fails if:**
- OTP request returns 400 (invalid phone or employee not seeded)
- OTP verify returns 400 (wrong code — check `OTP` in `seed-config.json`, not `.env`)
- Firebase refresh returns `TOKEN_EXPIRED` (transient — re-run)
- PIN creation returns non-200
- Profile does not reflect completed signup

---

## Negative Test Cases (Planned)

These cases are **not yet implemented**. Document and implement them in `api/tests/signup/signup-phone.test.ts` in a separate `describe('Signup Phone — negative cases')` block.

All negative tests still require:
- All four mandatory tags: `@component`, `@high/@medium`, `@regression`, `@guardian`
- Full `test.step()` wrapping
- Employee seeded via `setupSeedTeardown(phoneSignupProfile)` when a registered phone is needed

---

### TC-SIGN-NEG-001 · OTP Verify — Wrong OTP Code

**Priority:** High | **Status:** 🔲 PLANNED

**Scenario:** Request OTP for a valid, registered phone, then send a wrong code. The verify step must reject it.

**Setup:** Seed an employee with a valid phone. Request an OTP (step 1 of the happy path).

**Steps:**
1. `POST /signup/phone/otp/request` with valid seeded phone — capture `ref_code`
2. `POST /signup/phone/otp/verify` with correct phone + `ref_code` but wrong code (`000000`)
3. Assert response is 4xx (400 or 401)
4. Assert no Firebase token returned

**Teardown:** `hardDeleteEmployee(userId)`

**Pass when:**
```
OTP request: status = 200 (phone is registered)
OTP verify: status = 4xx
No Firebase custom token in response body
```

---

### TC-SIGN-NEG-002 · OTP Verify — Expired OTP

**Priority:** High | **Status:** 🔲 PLANNED

**Scenario:** Request OTP, wait for it to expire, then attempt to verify. The API must reject it.

**Setup:** Seed an employee. Request OTP.

**Steps:**
1. `POST /signup/phone/otp/request` — capture `ref_code`
2. Wait past OTP TTL (check API contract for exact TTL — typically 5 minutes)
3. `POST /signup/phone/otp/verify` with correct code but expired `ref_code`
4. Assert 4xx response

**Note:** This test may be slow (requires waiting for TTL). Consider skipping in standard regression runs — tag with `@slow` in addition to mandatory tags. Check whether the API has an endpoint to force-expire OTPs for testing purposes.

---

### TC-SIGN-NEG-003 · OTP Request — Phone Not Registered as Employee

**Priority:** High | **Status:** 🔲 PLANNED

**Scenario:** Request OTP for a phone number that has no employee record. The API must reject it.

**Setup:** No employee needed. Generate a random phone that is not in the DB.

**Steps:**
1. `POST /signup/phone/otp/request` with `resolvePhone()` result — but without seeding an employee first
2. Assert response is 4xx (404 or 400)

**Pass when:**
```
status = 4xx
No OTP sent
```

**Note:** On staging, `resolvePhone()` picks from the approved pool. If any pool number is already registered as an employee in staging, this test will false-fail. Verify the pool range is clean before running.

---

### TC-SIGN-NEG-004 · OTP Request — Already Signed-Up Phone

**Priority:** Medium | **Status:** 🔲 PLANNED

**Scenario:** Phone that has already completed signup (has a PIN) tries to request OTP again. Check whether the API allows re-OTP or blocks it.

**Setup:** Complete the full happy path for a phone (TC-SIGN-001 steps 1–7). Do not clean up before running this test.

**Steps:**
1. Complete signup for phone A (all steps including PIN creation)
2. Attempt `POST /signup/phone/otp/request` again with the same phone
3. Assert response — document actual behaviour (200 with `is_signup: true`, or 4xx)

**Teardown:** `hardDeleteEmployee(userId)`

**Note:** This documents API behaviour for re-signup attempts. The expected status depends on what the API actually does — the point is to detect regressions.

---

### TC-SIGN-NEG-005 · OTP Request — Invalid Phone Format

**Priority:** Medium | **Status:** 🔲 PLANNED

**Scenario:** Send a phone number that does not match the expected format. The API must reject with a validation error.

**Setup:** No employee needed.

**Steps:**
1. `POST /signup/phone/otp/request` with `phone: "not-a-phone"`
2. Assert 400 with a validation error message
3. Repeat with `phone: ""` (empty string)
4. Repeat with `phone: "12345"` (too short)

**Pass when:**
```
All three requests: status = 400
Response contains an error message
```

---

### TC-SIGN-NEG-006 · Create PIN — Invalid Firebase Token

**Priority:** High | **Status:** 🔲 PLANNED

**Scenario:** Attempt to create a PIN with an invalid or tampered Firebase ID token. The API must reject it as unauthorized.

**Setup:** No employee needed for the negative path itself.

**Steps:**
1. `POST /signup/create-pin` with `Authorization: Bearer invalid_token_here` and `pincode: PINCODE`
2. Assert 401

**Pass when:**
```
status = 401
No PIN created
```

---

### TC-SIGN-NEG-007 · Duplicate Signup — Phone Already Active

**Priority:** High | **Status:** 🔲 PLANNED

**Scenario:** Attempt to complete a full signup for a phone that already has an active user account (completed signup). The signup flow should block re-registration.

**Setup:** Seed an employee, complete full signup (TC-SIGN-001 steps 1–7).

**Steps:**
1. Complete full signup for phone A
2. Attempt to re-initiate signup from OTP request through verify
3. Assert the flow is blocked at some step (OTP verify, PIN create, or profile — check which step rejects)

**Teardown:** `hardDeleteEmployee(userId)`

**Note:** Identify which exact step the API blocks re-signup. Document the step and status code in this test case once discovered.
