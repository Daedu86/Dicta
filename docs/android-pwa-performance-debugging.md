# Android PWA Performance Debugging

Use this flow to diagnose typing delay in the installed Dicta PWA on a Samsung S22.

## Enable Diagnostics

1. Open the deployed app once with `?perf=1`, for example:
   `https://dicta-theta.vercel.app/training?perf=1`
2. The flag is saved in `localStorage` as `dicta.perfDiagnostics.v1`, so it remains active when the app is launched from the Android home screen as a standalone PWA/WebAPK.
3. To turn it off in production, open the app with `?perf=0`.

When enabled on `/training`, Dicta shows a tiny collapsible `Perf` overlay and logs structured events to the console with the `[DictaPerf]` prefix. A full snapshot is also available from DevTools:

```js
window.__DICTA_PERF__.snapshot()
```

## Remote Debug The Installed PWA

1. On the Samsung S22, enable Developer options and USB debugging.
2. Connect the phone to the laptop with USB and accept the debugging prompt on the phone.
3. On desktop Chrome, open `chrome://inspect/#devices`.
4. Launch Dicta from the phone home screen, not from a normal Chrome tab.
5. Look for the target under Remote Target. It may appear as an installed PWA/WebAPK, a standalone app target, or a separate Chrome target rather than a normal browser tab.
6. Click `inspect` for the Dicta target.

## Reproduce And Capture

1. Start a Browser TTS session in the installed PWA.
2. Type while TTS is speaking until the delayed text behavior appears.
3. Watch the overlay:
   - `Input paint`: how long typed text takes to visually paint.
   - `Input commit`: how long the local textarea buffer takes to reach React parent state.
   - `Long tasks`: browser main-thread stalls.
   - `Slow span`: app code sections above 50 ms.
   - `TTS start` and `TTS chunk`: speech synthesis timing.
   - `Textarea renders` and `Heap`: render and memory trend.
4. In DevTools Console, run:

```js
copy(JSON.stringify(window.__DICTA_PERF__.snapshot(), null, 2))
```

## How To Interpret

- High `Input paint` means the browser/PWA runtime or main thread is delaying visible text.
- Low `Input paint` but high `Input commit` means the low-latency textarea is working, but app-level metrics are delayed.
- Long tasks or slow spans during typing point to JavaScript blocking.
- Slow spans around `session.localStorage.persist`, `supabase.buildSyncState.*`, or `adaptive.benchmark.update` point to app architecture work.
- Large TTS start or chunk timings point to Android `speechSynthesis` behavior.
- Growing heap plus increasing latency suggests memory pressure.
