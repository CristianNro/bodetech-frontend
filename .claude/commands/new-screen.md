Add a new screen to BodeTech frontend.

Spec: $ARGUMENTS

Rules:
1. File: `app/<n>.js` — JavaScript, not TypeScript
2. Background: `<LinearGradient colors={["#2B0F16", "#4B1E2F"]} style={{flex:1}}>`
3. Colors: import from `src/theme/colors.js` only
4. API: use `API` from `src/api/client.js`, try/catch, Alert on failure
5. Nav params: `useLocalSearchParams()`. Use `router.push()` / `router.replace()`
6. Loading: `<ActivityIndicator color="#C6A969" />` centered
7. Focus refresh: `useFocusEffect(useCallback(() => { load() }, []))`
8. No global state — useState + useEffect only
9. Gestures: raw Responder API only
