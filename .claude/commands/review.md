Review frontend code changes or file(s): $ARGUMENTS

- [ ] Colors from `src/theme/colors.js` — no hardcoded hex
- [ ] LinearGradient background on all screens
- [ ] Slot ops scoped by `image_id`
- [ ] `getSlotKey(slot)` used for slot identity
- [ ] Drag/resize uses useRef — no setState during gesture move
- [ ] Both refs reset on end/terminate
- [ ] scaleX/scaleY applied correctly
- [ ] Invalid slots: red styling, movement allowed, Save blocked
- [ ] `deleted_slot_ids` = real UUIDs only
- [ ] No Redux / Zustand / new Context
- [ ] No Canvas / Skia
- [ ] New files = `.js` not `.tsx`
- [ ] No `constants/theme.ts` imports
