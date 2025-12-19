## Timeline API (Accounts & Events)

Endpoints are mobile/voice-first and keep events immutable while deriving account state.

### Create event for an existing account
`POST /api/timeline/accounts/:accountId/events`
```json
{
  "raw_input_text": "Passage en boutique, Sam confirme intérêt moyen, rappel mardi prochain.",
  "created_by": "rep-42"
}
```
Response includes the stored event and updated account state.

### Voice-first ingest (auto-create account when needed)
`POST /api/timeline/voice`
```json
{
  "accountName": "Coffee Lab Lyon",
  "raw_input_text": "Visite rapide. Julie, manager, intéressée par une démo. Budget environ 150 euros. Rappel le 23/12.",
  "created_by": "rep-42"
}
```

### AI structured output (contract)
```json
{
  "event_type": "visit",
  "contact_name": "Julie",
  "contact_role": "manager",
  "interest_level": "medium",
  "budget_estimate": 150,
  "next_action": {
    "type": "call",
    "date_suggestion": "2025-12-23"
  },
  "signals": ["manager_spoke", "wants_demo"],
  "blocking_points": [],
  "confidence_score": 0.82
}
```

### Account state derivation (examples)
- Two recent events with medium/high interest → lead_score +10 bonus.
- Demo → closing_probability ≥60; Deal → ≥80.
- No interaction for 14+ days → status cooling; lead_score penalty.
- `next_action.date_suggestion` → `accounts.next_action_at`.
