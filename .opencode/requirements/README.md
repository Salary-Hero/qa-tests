# QA Requirements Documentation

Team-shared requirements for the QA API test suite. All files here are committed to version control.

## Structure

```
requirements/
├── COVERAGE_MATRIX.md                  ← Start here for a full test overview
├── INFRASTRUCTURE_REQUIREMENTS.md      ← Environment setup, running tests, CI/CD
├── shared/
│   └── authentication.md              ← Admin login, Firebase token exchange
├── employee/                          ← Employee CRUD feature
│   ├── README.md
│   ├── test-requirements.md
│   ├── api-contract.md
│   ├── test-data.md
│   └── test-cases.md                  ← includes planned negative cases
├── signup-phone/                      ← Phone OTP signup feature
│   ├── README.md
│   ├── test-requirements.md
│   ├── api-contract.md
│   ├── test-data.md
│   └── test-cases.md                  ← includes planned negative cases
├── signup-line/                       ← LINE signup feature
│   ├── README.md
│   ├── test-requirements.md
│   ├── api-contract.md
│   ├── test-data.md
│   └── test-cases.md
├── signup-employee-id/                ← Employee ID signup feature
│   ├── README.md
│   ├── test-requirements.md
│   ├── api-contract.md
│   ├── test-data.md
│   └── test-cases.md
├── digital-consent/                   ← Digital consent (identity pre-loaded)
│   ├── README.md
│   ├── test-requirements.md
│   ├── api-contract.md
│   ├── test-data.md
│   └── test-cases.md
└── digital-consent-employee-id/       ← Digital consent (employee-ID-only import)
    ├── README.md
    ├── test-requirements.md
    ├── api-contract.md
    ├── test-data.md
    └── test-cases.md
```

## Where to Start

| Goal | Go to |
|------|-------|
| See all tests at a glance | [COVERAGE_MATRIX.md](./COVERAGE_MATRIX.md) |
| Set up and run the tests | [INFRASTRUCTURE_REQUIREMENTS.md](./INFRASTRUCTURE_REQUIREMENTS.md) |
| Request a new test from the AI | [HOW_TO_REQUEST_API_TESTS.md](../../HOW_TO_REQUEST_API_TESTS.md) |
| Understand auth / Firebase | [shared/authentication.md](./shared/authentication.md) |
| Work on Employee CRUD | [employee/README.md](./employee/README.md) |
| Work on Phone signup | [signup-phone/README.md](./signup-phone/README.md) |
| Work on LINE signup | [signup-line/README.md](./signup-line/README.md) |
| Work on Employee ID signup | [signup-employee-id/README.md](./signup-employee-id/README.md) |

## Each Feature Folder Contains

| File | Contents |
|------|---------|
| `README.md` | Feature overview, quick reference |
| `test-requirements.md` | Objectives, scope, pass/fail criteria, risks |
| `api-contract.md` | Endpoints, request/response format, status codes |
| `test-data.md` | Identifiers, constraints, data lifecycle |
| `test-cases.md` | Step-by-step test cases with pass criteria |

## Personal Notes

Personal working notes live in `.opencode/plans/` (gitignored — not committed).
