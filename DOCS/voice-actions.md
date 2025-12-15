# Voice-Driven Actions

- Endpoint: `POST /api/voice/ingest`
  - Body: `{ transcript: string, confirm?: boolean }`
  - Behavior:
    - If a matching contact is found (company/name/email), returns `{ status: "existing", client, proposedChanges }`
    - If not found, builds a prospect preview from transcript and returns `{ status: "preview", proposed }`
    - If `confirm: true` and no existing match, validates and creates the client, returns `{ status: "created", client }`
  - Errors: 400 on validation/empty transcript; 500 on server/db issues.

- Utilities:
  - `extractFieldsFromTranscript` parses company/contact/phone/email heuristically.
  - `buildProspectFromTranscript` maps transcript → Contact schema, returning validation errors if any.
  - `findMatchByCompanyOrContact` checks existing list for matches.

- UI:
  - `VoiceIntakeDialog` allows paste/dictate transcript, preview, and confirm create.
  - Triggered from Contacts page via “Capture vocale”.
