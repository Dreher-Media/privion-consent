---
title: Default styles
description: The opt-in stylesheet at `@privion-consent/dom/styles.css` — themable via CSS custom properties.
---

```ts
import '@privion-consent/dom/styles.css';
```

The stylesheet targets both attribute styles (unprefixed `[privion-banner]` for the DOM adapter / Astro components and `[data-privion-banner]` for the React components) so a single import covers any binding. Skip the import and components stay fully unstyled.

## Theme tokens

| Property                  | Default (light)                | Notes                                          |
| ------------------------- | ------------------------------ | ---------------------------------------------- |
| `--privion-bg`            | `#ffffff`                      | Banner / panel background                      |
| `--privion-fg`            | `#111827`                      | Body text                                      |
| `--privion-muted`         | `#6b7280`                      | Secondary text (descriptions, helper labels)   |
| `--privion-border`        | `#e5e7eb`                      | Borders between toggle rows / panel edges      |
| `--privion-accent`        | `#2563eb`                      | Primary buttons (Accept all, Save preferences) |
| `--privion-accent-fg`     | `#ffffff`                      | Text on primary buttons                        |
| `--privion-radius`        | `0.75rem`                      | Banner / panel corner radius                   |
| `--privion-shadow`        | `0 10px 30px rgb(0 0 0 / 12%)` | Banner / panel drop shadow                     |
| `--privion-z-banner`      | `1000`                         | Banner z-index                                 |
| `--privion-z-preferences` | `1001`                         | Preferences modal z-index                      |
| `--privion-backdrop`      | `rgb(15 23 42 / 50%)`          | Preferences modal backdrop                     |

## Dark mode

Honors `prefers-color-scheme: dark` automatically. Override globally:

```html
<html data-privion-theme="dark">
  ...
</html>
<html data-privion-theme="light">
  ...
</html>
```

## Overrides

Redefine any property on `:root` or a narrower scope:

```css
:root {
  --privion-accent: #7c3aed;
  --privion-radius: 0;
}
```

## Canonical reference

[SPECIFICATION.md §12](https://github.com/Dreher-Media/privion-consent/blob/main/SPECIFICATION.md#12-default-styles-opt-in).
