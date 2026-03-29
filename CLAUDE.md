# bodetech-frontend

React Native 0.81.5 + Expo SDK 54 + Expo Router ~6.0

## Running

```bash
npm install
npx expo start
```

**API base URL** — change to your LAN IP in `src/api/client.js`:
```js
const API_BASE_URL = "http://192.168.56.1:8000"
```

## Key files

```
app/
  _layout.js        ← GestureHandlerRootView + AuthProvider + Stack
  index.js          ← landing
  login.js / register.js
  cellars.js        ← list + create modal + delete modal
  scan-wall.js      ← image gallery + upload → navigates to edit-wall
  edit-wall.js      ← THE SLOT EDITOR
  chat.js           ← stub (unused)
  create-cellar.js  ← legacy/unused
components/
  CellarWallImagesGallery.js  ← animated snap carousel + custom scrollbar
  ScanWallUploadCard.js       ← camera + gallery picker card
src/
  api/client.js       ← Axios + JWT interceptor + 401→/login redirect
  auth/AuthContext.js ← login, register, logout, bootstrapAuth
  theme/colors.js     ← design tokens ← ALWAYS import from here
```

## Design tokens (src/theme/colors.js)

```js
backgroundTop: "#2B0F16",  backgroundBottom: "#4B1E2F"
card: "#1F1A1D",           input: "#2A2226"
textPrimary: "#F5F1E9",    textSecondary: "#C6A969",  textMuted: "#D7D0C7"
buttonPrimary: "#C6A969",  buttonText: "#2B0F16"
border: "rgba(198,169,105,0.3)",  error: "#FF6B6B"
```

All screens: `<LinearGradient colors={["#2B0F16", "#4B1E2F"]} style={{flex:1}}>`
Never import from `constants/theme.ts`.

## Rules

- `useState` + `useEffect` only — no global state managers
- Focus refresh: `useFocusEffect(useCallback(() => { load() }, []))`
- Gestures: raw Responder API — do NOT add gesture-handler library components
- React Compiler enabled — no inline state mutation
- All new files: `.js` not `.tsx`
