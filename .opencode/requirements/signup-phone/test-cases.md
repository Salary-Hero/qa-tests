# Signup: Phone — Test Cases

Test file: `api/tests/signup/signup-phone.test.ts`
Run: `npm run test:api -- api/tests/signup/signup-phone.test.ts`

---

## TC-SIGN-001 · Phone Signup — Complete Flow

**Priority:** Critical | **Status:** ✅ PASS | **Line:** `:32`

**Preconditions:**
- Seeded employee exists with generated `phone`, `email`, `employee_id`
- `OTP=123456` and `PINCODE=999999` set in `.env`
- Firebase API key configured

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
- OTP verify returns 400 (wrong code — check `OTP` env var)
- Firebase refresh returns `TOKEN_EXPIRED` (transient — re-run)
- PIN creation returns non-200
- Profile does not reflect completed signup
