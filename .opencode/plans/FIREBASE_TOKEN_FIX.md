# Firebase ID Token Issue - Phone & LINE Signup

**Status**: IDENTIFIED - Root cause found  
**Impact**: Phone signup and LINE signup flows fail at Create PIN step  
**Tests Failing**: 
- `api/tests/signup/signup-phone.test.ts`
- `api/tests/signup/signup-line.test.ts`

---

## Problem Summary

When users complete phone or LINE signup and receive a Firebase ID token, the Create PIN endpoint (`/api/v1/user/account/profile/pincode/create`) returns **404 "user not found"**.

### Root Cause

**The Firebase UID is not linked to the system user_id.**

1. User completes OTP verification
   - Backend creates user with `user_id: 1262747`
   - Backend creates Firebase custom token with `uid: Uww4ykoBX2bnbFFkTkK922rGq8w1`
   
2. Client exchanges custom token for Firebase ID token
   - ID token contains `user_id: Uww4ykoBX2bnbFFkTkK922rGq8w1` (Firebase UID)
   
3. Client tries to Create PIN using ID token
   - Backend extracts Firebase UID from token: `Uww4ykoBX2bnbFFkTkK922rGq8w1`
   - Backend queries database: "SELECT user WHERE firebase_uid = ?"
   - **No match found** → Returns 404 "user not found"

### Why Employee-ID Signup Works

The employee-ID signup flow works because:
- The user already exists in the system before authentication
- The Firebase UID is properly linked to an existing employee record
- The lookup succeeds and Create PIN works

---

## Evidence

### Token Analysis

**Firebase Custom Token** (returned from OTP verify):
```json
{
  "uid": "Uww4ykoBX2bnbFFkTkK922rGq8w1",
  "iss": "firebase-adminsdk-l9mok@salary-hero-dev.iam.gserviceaccount.com"
}
```

**Firebase ID Token** (from Google):
```json
{
  "user_id": "Uww4ykoBX2bnbFFkTkK922rGq8w1",
  "email": "128-@user.com",
  "aud": "salary-hero-dev"
}
```

**System User** (created during OTP verify):
```json
{
  "user_id": 1262747,
  "company_id": 128,
  "phone": "0844889955",
  "first_name": "QA",
  "last_name": "PhoneSignup"
}
```

### Test Output
```
Create PIN Response:
Status: 404
Body: {"message":"user not found"}
```

---

## How to Fix

### Option 1: Backend Fix (RECOMMENDED)

**Location**: Backend service that handles phone/LINE signup OTP verification

**What to Fix**: Ensure Firebase UID is persisted to the database when user is created

```typescript
// When creating user in OTP verify handler:
const user = await createUser({
  user_id: 1262747,
  company_id: 128,
  phone: '0844889955',
  firebase_uid: 'Uww4ykoBX2bnbFFkTkK922rGq8w1'  // ← Add this
});

// Create lookup table or add column to users table:
// users.firebase_uid = firebase_uid
```

**Verification**:
1. After OTP verify, check database: `SELECT user_id FROM users WHERE firebase_uid = 'Uww4ykoBX2bnbFFkTkK922rGq8w1'`
2. Should return the newly created user_id (1262747)

### Option 2: Test Workaround (If Backend Can't Be Fixed)

**Location**: `api/tests/signup/signup-phone.test.ts` and `signup-line.test.ts`

If the backend can't be fixed quickly, you could:

1. **Skip Create PIN step** in phone/line tests temporarily
2. **Test only up to OTP verification** to validate the signup flow works
3. **Add TODO** to fix when backend is fixed

```typescript
await test.step('Create PIN (SKIPPED - Firebase UID not linked)', async () => {
  // TODO: Re-enable when backend properly links Firebase UID to user_id
  console.log('⚠️  Skipping Create PIN - Firebase UID linking issue')
  // await createPin(...)
})
```

### Option 3: Database Fix (If You Have Direct DB Access)

If backend can't be changed and you have DB access:

```sql
-- Link Firebase UIDs to users
UPDATE users 
SET firebase_uid = 'Uww4ykoBX2bnbFFkTkK922rGq8w1'
WHERE user_id = 1262747;

-- Create index for faster lookups
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
```

---

## Technical Details

### Phone Signup Flow
1. ✅ POST `/api/v2/public/account/signup/phone` - Request OTP
2. ✅ POST `/api/v2/public/account/signup/phone?action=verify` - Verify OTP + Get Firebase token
3. ✅ POST `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken` - Firebase auth
4. ✅ POST `https://securetoken.googleapis.com/v1/token` - Refresh for ID token
5. ❌ POST `/api/v1/user/account/profile/pincode/create` - Create PIN (404 user not found)

### LINE Signup Flow
Similar, but fails at LINE signup step due to different issue (428 error - likely expired LINE token)

---

## Prevention

To prevent this in future signup methods:

1. **Create test that verifies Firebase UID is persisted**
   ```typescript
   // In OTP verification, log the created user:
   console.log('Created user:', { user_id: 1262747, firebase_uid: token.uid })
   ```

2. **Query database to confirm link**
   ```typescript
   const user = await db.query(
     'SELECT user_id FROM users WHERE firebase_uid = ?',
     [firebaseUid]
   )
   expect(user).toBeDefined()
   ```

3. **Test Create PIN immediately after OTP**
   - Don't assume Firebase auth will solve the lookup
   - Verify backend can find user by Firebase UID

---

## Summary

| Aspect | Details |
|--------|---------|
| **Root Cause** | Firebase UID not linked to user_id in database |
| **Error** | 404 "user not found" at Create PIN endpoint |
| **Where** | Backend OTP verification handler |
| **Fix Type** | Backend - Add firebase_uid persistence |
| **Effort** | Low (1 field addition + test) |
| **Workaround** | Skip Create PIN test step temporarily |
| **Verification** | Query DB: `SELECT user_id FROM users WHERE firebase_uid = ?` |
