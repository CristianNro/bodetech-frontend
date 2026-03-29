# app/ — Slot Editor details

## Editor state (edit-wall.js)

```js
// useState
draftSlots / deletedSlotIds / selectedSlotId / previewWidth / loading / saving

// useMemo
invalidSlotKeys  // Set<string> — recomputed on every draftSlots change
hasInvalidSlots  // disables Save
scaleX = previewWidth / originalWidth
scaleY = previewHeight / originalHeight

// useRef (no re-render during gesture)
dragRef   = { slotKey, startPageX, startPageY, startBBox }
resizeRef = { slotKey, corner, startPageX, startPageY, startBBox }
```

## Slot identity

```js
getSlotKey(slot) = slot.slot_id || slot.temp_id
// New: { slot_id: null, temp_id: "tmp-<timestamp>-<count>" }
// deletedSlotIds: real UUIDs only — never temp_ids
```

## Coordinate math

```js
// Render:  left = bbox.x * scaleX
// Gesture: dx = dxPx / scaleX
```

## Resize corners

| corner | changes |
|--------|---------|
| `tl` | x+=dx, y+=dy, w-=dx, h-=dy |
| `tr` | y+=dy, w+=dx, h-=dy |
| `bl` | x+=dx, w-=dx, h+=dy |
| `br` | w+=dx, h+=dy |

Min size: `MIN_W=30`, `MIN_H=30`

## Validation

- Invalid if: out of bounds OR overlaps another slot
- Invalid → red styling, movement NOT blocked, Save blocked
- `getInvalidSlotKeys()` runs as `useMemo`

## Batch save payload

```js
{ slots: [{slot_id|temp_id, slot_index, bbox, status, is_active, is_user_corrected}],
  deleted_slot_ids: ["uuid"] }
```

## ⚠ scan-wall.js — startEditing/cancelEditing son dead code

El editor de slots activo es `edit-wall.js`, navegado via `router.push`.
`startEditing()` y `cancelEditing()` nunca se llaman — **no agregar features ahí**.
Los state vars `isEditing` / `draftSlots` / `hasUnsavedChanges` SÍ se usan para el conteo de display y el condicional de botones.

## NOT implemented (do not reactivate)

- Undo/redo
- Unsaved changes guard ← NEXT PRIORITY
