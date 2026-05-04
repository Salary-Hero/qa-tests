# <Feature Name> — API Contract

Base URL: `https://apiv2-{ENV}.salary-hero.com/api`

All endpoints require: `Authorization: Bearer {adminToken}`

---

## <Endpoint Name>

**`METHOD /v1/path/to/endpoint`**

**Request:**
```json
{
  "field": "value"
}
```

**Response (2xx):**
```json
{
  "field": "value"
}
```

**Status Codes:**
- `200` / `201` — Success
- `400` — Invalid data / missing required field
- `401` — Unauthorised
- `403` — Permission denied / read-only field in payload
- `404` — Resource not found
- `409` — Unique constraint violation

**Read-only fields** (must NOT be sent in update payloads):
<!-- list fields like user_id, created_at, updated_at -->

**Type quirks:**
<!-- e.g. paycycle_id is returned as string but must be sent as number -->

---

## Error Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```
