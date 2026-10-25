# Decisions

- Email magic links are used for authentication because they avoid collecting a password.
- The profile timezone defaults to `Asia/Kolkata`; a database trigger is the authority for a log's local date.
- Ingredient reference rows are not seeded without a supplied USDA export or equivalent source file. Inventing those values would violate the data policy.
- Phase 7 estimate presets remain unavailable until each has a written, sourced basis. An empty honest list is safer than a guessed preset.
- UI implementation may span original phase boundaries when it only exposes existing, secure functionality. Unshipped destinations remain hidden rather than mocked.
- Phase 7 adjustment persistence uses a new frozen snapshot version. USDA ingredient rows require a supplied export with source identifiers; no default values are seeded.
