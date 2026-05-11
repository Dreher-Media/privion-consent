---
title: Attribute schema
description: Every `privion-*` attribute the DOM adapter recognizes.
---

The `@privion-consent/dom` adapter inspects the page for attributes listed below. Framework-agnostic — anything that doesn't strip them at build time works.

`initPrivionDom(consent)` returns a `PrivionDomHandle`; call `handle.destroy()` from SPA route teardown to disconnect MutationObservers and unsubscribe consent listeners.

## Script gating

```html
<script type="privion" privion-category="analytics" src="…"></script>
```

- `type="privion"` makes the script non-executable until consent. Browsers won't run a script whose type isn't a known JavaScript MIME.
- `privion-category="analytics,marketing"` lists the categories that must be granted before activation (comma- or space-separated).
- On grant, the adapter creates a **new** `<script>` element copying `src` (or inline `textContent`), `async`, `defer`, `nonce`, `crossOrigin`, and inserts it right after the original. The original stays inert.
- Activation is one-shot. Toggling the category back to `denied` doesn't unload an already-activated script — that's a host concern (typically a page reload).
- `categoryMatchMode` (`initPrivionDom` option) defaults to `'any'`; set to `'all'` to require every listed category.

## Iframe gating

```html
<iframe privion-category="marketing" privion-src="https://…" src="about:blank"></iframe>
```

- Render with `src="about:blank"` so nothing loads pre-consent.
- `privion-src` carries the real URL. On activation, the adapter writes `iframe.src = realSrc`.

## Conditional visibility

```html
<div privion="analytics">visible if analytics granted</div>
<div privion="!marketing">visible if marketing NOT granted</div>
<div privion="analytics,!marketing">visible if both conditions hold</div>
```

Expression is comma- or space-separated tokens. Bare token requires the category to be `granted`; `!category` requires it to **not** be `granted`. All positive tokens must match AND all negative tokens must match. The original `style.display` is restored when the element becomes visible.

## UI hooks

```html
<div privion-banner hidden>…</div>
<div privion-preferences hidden>…</div>

<button privion-accept-all>Accept all</button>
<button privion-reject-all>Reject all</button>
<button privion-open-preferences>Customize</button>
<button privion-save-preferences>Save</button>

<input type="checkbox" privion-toggle="analytics" />
<input type="checkbox" privion-required="necessary" disabled checked />
```

- `[privion-banner]` is unhidden iff `state.userDecided === false`.
- `[privion-preferences]` is initially hidden; clicking `[privion-open-preferences]` un-hides it.
- `[privion-accept-all]` / `[privion-reject-all]` call `acceptAll()` / `rejectAll()` and hide both banner and preferences.
- `[privion-save-preferences]` collects all `[privion-toggle]` checkboxes and calls `setMany(updates, 'preferences')`.
- `[privion-required]` checkboxes are auto-disabled and force-checked.

## Late injection

The adapter watches the DOM via `MutationObserver` — scripts, iframes, and `[privion]` elements added after `initPrivionDom(...)` runs are picked up automatically. No re-init needed for SPA hydration or framework islands.

## Canonical reference

[SPECIFICATION.md §3](https://github.com/Dreher-Media/privion-consent/blob/main/SPECIFICATION.md#3-attribute-schema-dom-adapter).
