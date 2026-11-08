# Decisions

- Email magic links are used for authentication because they avoid collecting a password.
- The profile timezone defaults to `Asia/Kolkata`; a database trigger is the authority for a log's local date.
- Ingredient reference rows are not seeded without a supplied USDA export or equivalent source file. Inventing those values would violate the data policy.
- Phase 7 estimate presets remain unavailable until each has a written, sourced basis. An empty honest list is safer than a guessed preset.
- UI implementation may span original phase boundaries when it only exposes existing, secure functionality. Unshipped destinations remain hidden rather than mocked.
- Phase 7 adjustment persistence uses a new frozen snapshot version. USDA ingredient rows require a supplied export with source identifiers; no default values are seeded.
- The frontend now uses App Router route groups and one `page.tsx` per navigable URL. Routes whose persistence contract has not been verified use an explicit capability state rather than fake food, recipe, tracker, or history data. `/today?preview=1` is the only demo route and labels all sample content as unsaved demo data.
- The Add Food nutrition preview is calculated with the same shared `resolveQuantity` rules used by the log API. It exposes only the API-supported `serving` and `g` units; household portions are displayed only as an existing serving name, never converted client-side.
- Initial setup requires a daily intake target and a separate daily activity-energy target. The targets are versioned, and the app never subtracts activity from intake or presents a net-calorie value.
- Diary deletion is server-authorized through `DELETE /api/logs?id=...`; the UI requires a second explicit confirmation press and does not optimistically claim success.
