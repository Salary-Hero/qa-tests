# Signup: LINE — Test Cases

Test file: `api/tests/signup/signup-line.test.ts`
Run: `npm run test:api -- api/tests/signup/signup-line.test.ts`

---

## TC-SIGN-002 · LINE Signup — Complete Flow

**Priority:** Critical | **Status:** ✅ PASS | **Line:** `:35`

**Preconditions:**
- Seeded employee exists with fixed `line_id`, generated `phone`, `email`, `employee_id`
- `line_id` was cleared to null in pre-seed cleanup (constraint released)
- `OTP=123456`, `PINCODE=999999`, `LINE_CHANNEL_ID`, `LINE_ACCESS_TOKEN_DEV` set in `.env`

**Steps:**

| Step | Action | Expect |
|------|--------|--------|
| 1 | `POST /signup/line` `{ channel_id, access_token, fcm_token: "" }` | 200, `is_signup: false`, `auth_challenge` returned |
| 2 | `POST /signup/line/phone?action=request` `{ phone, auth_challenge }` | 200, `ref_code` returned |
| 3 | `POST /signup/line/phone?action=verify` `{ phone, auth_challenge, verification: { ref_code, code: OTP } }` | 200, Firebase custom token returned |
| 4 | Firebase sign in with custom token | 200, `refreshToken` returned |
| 5 | Firebase refresh token (pre-PIN) | 200, `id_token` returned |
| 6 | `POST /signup/create-pin` `{ pincode: PINCODE }` | 200, `"Create PIN successfully"` |
| 7 | Firebase refresh token (post-PIN) | 200, new `id_token` returned |
| 8 | `GET /signup/profile` | 200, `line_id` matches, `has_pincode: true`, `signup_at` not null |
| 9 | `POST /signup/logout` (best-effort) | Any status |

**Pass when:**
```
step 1: body.is_signup = false
        body.verification_info.auth_challenge defined
step 2: body.verification.ref_code defined
step 3: body.verification.token defined
step 6: body.message = "Create PIN successfully"
step 8: body.profile.line_id = ctx.identifiers.line_id
        body.profile.has_pincode = true
        body.profile.signup_at != null
```

**Fails if:**
- Step 1 returns 428 — `line_id` constraint not released from previous run (check cleanup logic)
- Step 1 returns 401 — LINE access token expired (refresh `LINE_ACCESS_TOKEN_DEV` in `.env`)
- OTP verify returns 400 — check `OTP` env var
- Profile `line_id` doesn't match expected fixed value

**Key difference from Phone signup:** Step 1 is a LINE-specific auth exchange; OTP is then attached to the LINE session via `auth_challenge`.
