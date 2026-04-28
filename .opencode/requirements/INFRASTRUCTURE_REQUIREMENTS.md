# Infrastructure Requirements

Complete specification of environment setup, dependencies, and infrastructure required to run the QA test suite.

## System Requirements

### Operating System
- **macOS:** 10.15+ (Intel or Apple Silicon)
- **Linux:** Ubuntu 18.04+ or equivalent
- **Windows:** Windows 10+ with WSL2 (not tested)

### Runtime Environment
- **Node.js:** v18.0.0 or higher
- **npm:** v8.0.0 or higher (Node.js includes npm)

### Disk Space
- **Minimum:** 2GB free space
- **Recommended:** 5GB free space (for reports and caches)

---

## Dependency Installation

### Step 1: Install Node.js

**macOS (using Homebrew):**
```bash
brew install node@18
node --version  # Verify installation
npm --version
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version
```

**From Source:**
Visit https://nodejs.org/en/download/ for other installation methods

### Step 2: Clone Repository

```bash
git clone <repository-url>
cd qa-tests
```

### Step 3: Install Project Dependencies

```bash
npm install
```

This installs all required packages from `package.json`:

**Key Dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| `@playwright/test` | 1.59+ | Test framework & browser automation |
| `zod` | 4.3+ | Schema validation |
| `pg` | 8.20+ | PostgreSQL database client |
| `dotenv` | 17.4+ | Environment variable management |
| `uuid` | 14.0+ | UUID generation for test data |

> **Note on `DOTENV_CONFIG_QUIET=true NODE_NO_WARNINGS=1`:** The cleanup scripts use `tsx -r dotenv/config` which can emit Node.js deprecation warnings. All `yarn` scripts suppress this with that prefix. If you run scripts directly without `yarn`, you may see cosmetic warnings — they do not affect test execution.

**Dev Dependencies:**
- `@types/node` - TypeScript type definitions
- `@types/pg` - PostgreSQL type definitions
- `typescript` - TypeScript compiler
- `prettier` - Code formatting

### Step 4: Install Playwright Browsers

```bash
npx playwright install
```

This downloads browser binaries (Chromium, Firefox, WebKit) needed for testing.

---

## Environment Configuration

### Create .env File

```bash
# Copy the template
cp .env.example .env

# Edit with your values
nano .env  # or your preferred editor
```

### Environment Variables

There is a **single `.env` file** at the project root. Each key uses a `_DEV` or `_STAGING` suffix — never split into separate `.env.dev` / `.env.staging` files. The `ENV` variable controls which suffix is active at runtime.

> **OTP and PINCODE are not in `.env`.** They live in `shared/fixtures/seed-config.json` per environment. Never add `OTP=` or `PINCODE=` to `.env`.

```env
# Which environment is active — controls which _DEV / _STAGING keys are used
ENV=dev

# Admin credentials
ADMIN_EMAIL_DEV=admin@example.com
ADMIN_EMAIL_STAGING=admin-staging@example.com
ADMIN_PASSWORD_DEV=password123
ADMIN_PASSWORD_STAGING=password_staging

# Firebase
FIREBASE_API_KEY_DEV=AIza...{your-dev-firebase-key}
FIREBASE_API_KEY_STAGING=AIza...{your-staging-firebase-key}

# LINE Integration (for LINE signup tests only)
LINE_CHANNEL_ID_DEV=1234567890
LINE_CHANNEL_ID_STAGING=0987654321
LINE_CHANNEL_SECRET_DEV=abc123
LINE_CHANNEL_SECRET_STAGING=def456
LINE_REFRESH_TOKEN_DEV={your-dev-line-refresh-token}
LINE_REFRESH_TOKEN_STAGING={your-staging-line-refresh-token}

# Database — dev and staging share the same RDS host, different DB names
DB_HOST=salary-hero.c5abcd.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=secure_password
DB_NAME_DEV=salary_hero_dev
DB_NAME_STAGING=salary_hero_staging
DB_SSL=true
```

**Keys that must NOT be in `.env`:**

| Key | Correct location | Reason |
|---|---|---|
| `OTP` | `shared/fixtures/seed-config.json` | Per-env value; wrong OTP on staging sends a real SMS |
| `PINCODE` | `shared/fixtures/seed-config.json` | Same reason |
| `TEST_COMPANY_ID` | `shared/fixtures/seed-config.json` | Use `getCompany('name')` — never hardcode |
| `API_BASE_URL` | `playwright.config.ts` | Base URL lives in Playwright config, not `.env` |
| `DB_NAME` | N/A — use `DB_NAME_DEV` / `DB_NAME_STAGING` | Prevents accidentally connecting wrong DB |

**Security Note:**
- Never commit `.env` (already in .gitignore)
- Keep `.env` file secure and confidential
- Use different credentials for DEV and STAGING
- Don't share credentials in chat/email

### Validate Environment Setup

```bash
# Check Node.js and npm versions
node --version
npm --version

# Verify dependencies installed
npm list @playwright/test
npm list zod
npm list pg

# Verify TypeScript compiles
npm run tsc
```

---

## Database Configuration

### PostgreSQL Requirements

**Minimum Version:** PostgreSQL 12+
**Connection:** Network accessible from test machine

### Connection Setup

**Local Development (if running locally):**
```bash
# Install PostgreSQL
brew install postgresql  # macOS
# or
sudo apt-get install postgresql  # Linux

# Start service
brew services start postgresql  # macOS
pg_ctl -D /usr/local/var/postgres start  # macOS alternative

# Create test database
createdb salary_hero_dev
```

**Remote Development (Cloud Database — standard setup):**
```bash
# Configure in .env:
DB_HOST=salary-hero-dev.c5abcd.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=secure_password
DB_NAME_DEV=salary_hero_dev
DB_NAME_STAGING=salary_hero_staging
DB_SSL=true
```

`shared/db.ts` reads `DB_NAME_DEV` or `DB_NAME_STAGING` based on the active `ENV`. Never use a plain `DB_NAME` key.

### Database Tables Required

Tests assume these tables exist:

| Table | Purpose |
|-------|---------|
| `users` | Employee user records |
| `employment` | Employment relationships |
| `user_identity` | Identity information (national_id, passport_no) |
| `user_balance` | Account balance tracking |
| `user_address` | Address information |
| `user_bank` | Bank account details |
| `user_provider` | Third-party auth provider links (LINE, Entra ID) — no FK to `users`, must be deleted explicitly |
| `employee_profile` | Consent status and employee profile records |
| `employee_profile_audit` | Audit trail for employee_profile changes |

**Delete order for `hardDeleteEmployee()`:** `employee_profile_audit → employee_profile → employment → user_identity → user_balance → user_bank → user_provider → users`

**Initialization:**
Database should be pre-initialized with schema and test company data. Never use `company_id=128` as a hardcoded literal — resolve via `getCompany('phone')` or the relevant auth method name.

---

## Firebase Configuration

### Firebase Project Setup

1. **Create Firebase Project:**
   - Go to https://console.firebase.google.com/
   - Create new project (or use existing)
   - Note Project ID

2. **Enable Authentication:**
   - Authentication → Sign-in method
   - Enable "Custom claims" for admin testing

3. **Get API Key:**
   - Project Settings → Service Accounts → Private Key
   - Or: Project Settings → General → Web API Key
   - Store in `.env` as `FIREBASE_API_KEY_DEV`

4. **Configure Custom Token:**
   - Set appropriate token expiration (15 minutes minimum)
   - Allow admin to generate custom tokens

### Firebase Integration Points

Tests use Firebase for:
- Custom token generation (from OTP verification)
- User authentication (Firebase sign-in)
- ID token refresh (for API authentication)
- Profile management

---

## LINE Integration (Optional)

### LINE Configuration

Required **only** for LINE signup tests.

**Setup:**
1. Create LINE Developer account at https://developers.line.biz/
2. Create LINE Login channel
3. Get Channel ID and Channel Secret
4. Configure webhook (if required)

**Environment Variables:**
```env
LINE_CHANNEL_ID=1234567890
LINE_BUSINESS_ID=B1234567890
LINE_CHANNEL_SECRET=abc123def456
```

**In Tests:**
Tests use pre-generated LINE access tokens from `.env` rather than full OAuth flow.

---

## Playwright Configuration

### Browser Configuration

**File:** `playwright.config.ts`

**Current Settings:**
```typescript
export const config: PlaywrightTestConfig = {
  testDir: './api/tests',
  timeout: 60000,               // 60 second per test timeout
  expect: { timeout: 10000 },   // 10 second assertion timeout
  fullyParallel: false,         // Tests run serially
  
  projects: [
    {
      name: 'api',
      use: { baseURL: getApiBaseUrl() },
    }
  ]
};
```

**Key Settings:**
- **Serial execution:** Prevents test data conflicts
- **60 second timeout:** Allows for slow API responses
- **No browsers:** API testing (HTTP only, no browser needed)

---

## Running Tests

### Basic Execution

```bash
# Run all API tests (DEV environment)
yarn test:api

# Run specific test file
yarn test:api --grep "Employee CRUD"

# Run smoke tests only
yarn test:api --grep @smoke

# Run tests for a specific squad
yarn test:api --grep @guardian
```

### With Different Environments

```bash
# STAGING environment
yarn test:api:staging

# Smoke gate on staging
yarn test:api:staging --grep @smoke
```

### Test Results

Tests generate outputs in:
- **Console:** Real-time test progress
- **HTML Report:** `playwright-report/index.html`
  ```bash
  npm run report  # Open in browser
  ```
- **JSON Report:** `test-results/report.json` (if configured)
- **Test Results:** `test-results/` folder with failure screenshots

---

## CI/CD Integration

### GitHub Actions (Example)

**.github/workflows/qa-tests.yml:**
```yaml
name: QA Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm install
      - run: npx playwright install
      
      - run: npm run test:api
        env:
          ENV: dev
          API_BASE_URL: ${{ secrets.API_BASE_URL }}
          ADMIN_EMAIL_DEV: ${{ secrets.ADMIN_EMAIL }}
          ADMIN_PASSWORD_DEV: ${{ secrets.ADMIN_PASSWORD }}
          ...
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Environment Variables in CI/CD

Store sensitive values as GitHub Secrets:
- `API_BASE_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `FIREBASE_API_KEY_DEV`
- `DB_PASSWORD`

---

## Cleanup Strategy

### afterEach vs the cleanup script — when to use each

| Situation | Use |
|---|---|
| Normal test run — each test creates one employee | `afterEach` with `hardDeleteEmployee()` via the seed profile |
| Test crashed mid-run and left orphaned data | `yarn cleanup:dev --force` |
| Staging run left orphaned phone numbers blocking re-runs | `yarn cleanup:staging --force` |
| Pre-seed forced cleanup before creating a fresh employee | Built into `seedFromProfile()` — runs automatically |

### How `afterEach` cleanup works

Tests using `setupSeedTeardown(profile)` get automatic lifecycle hooks. After each test, `cleanupFromProfile()` runs all cleanup steps defined in the profile — best-effort, errors are logged as warnings and never thrown. This means a cleanup failure does not mask a test failure.

### Cleanup script

```bash
yarn cleanup:dev --force      # removes all EMPAPI* employees from dev DB
yarn cleanup:staging --force  # same for staging
```

The script targets employees whose `employee_id` starts with `EMPAPI`. This prefix is enforced by `generateEmployeeId()` in `api/helpers/identifiers.ts`. Never change the prefix without updating the cleanup script.

The script also removes orphaned `user_provider` rows for QA company IDs, since `user_provider` has no FK cascade from `users`.

### Manual cleanup via API

If you need to delete a specific employee by user_id without running the script:

```bash
# Get admin token first, then:
curl -X DELETE https://apiv2-dev.salary-hero.com/api/v1/admin/account/employee/{userId} \
  -H "Authorization: Bearer {token}"
```

Note: The API performs a **soft delete** only — `deleted_at` is set but records remain. Soft-deleted phone numbers still block uniqueness constraints. Always follow with `hardDeleteEmployee(userId)` from `shared/db-helpers.ts` if you need full cleanup.

---

## Troubleshooting

### Common Issues

**Issue:** `Cannot find module 'pg'`
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Issue:** `Connection refused` (Database)
```bash
# Solution: Verify database is running
# macOS:
brew services list | grep postgres

# Linux:
sudo systemctl status postgresql

# Try connecting:
psql -h localhost -U postgres
```

**Issue:** `ENOTFOUND api.example.com`
```bash
# Solution: Check API_BASE_URL in .env
cat .env | grep API_BASE_URL

# Verify connectivity:
curl https://apiv2-dev.salary-hero.com/api
```

**Issue:** Playwright timeout (60+ seconds)
```bash
# Solution: Increase timeout in playwright.config.ts
timeout: 120000,  // 2 minutes

# Or run specific test:
npm run test:api -- api/tests/employees/employee.spec.ts --timeout=120000
```

### Debug Mode

```bash
# Run with verbose logging
DEBUG=*:* npm run test:api

# Run in debug mode (opens inspector)
npm run test:api -- --debug

# Save detailed logs
npm run test:api -- --reporter=verbose
```

---

## Performance Requirements

### Recommended Machine Specs

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU Cores | 2 | 4+ |
| RAM | 4GB | 8GB+ |
| Disk (SSD) | 5GB free | 10GB+ free |
| Network | 1 Mbps | 10 Mbps+ |

### Test Execution Times

| Test Suite | Expected Time |
|-----------|----------------|
| All 9 tests | 40-50 seconds |
| Single test | 4-20 seconds |
| CREATE test | 4-6 seconds |
| Signup flow | 8-18 seconds |

---

## Related Documents

- 📋 [TEST_REQUIREMENTS.md](./TEST_REQUIREMENTS.md) - Test requirements overview
- 🔌 [API_CONTRACT.md](./API_CONTRACT.md) - API specifications
- 📊 [TEST_DATA_REQUIREMENTS.md](./TEST_DATA_REQUIREMENTS.md) - Test data specs
- 🧪 [TEST_CASES.md](./TEST_CASES.md) - Detailed test cases
