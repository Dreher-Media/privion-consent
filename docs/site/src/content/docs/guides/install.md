---
title: Install
description: Picking the right package for your project.
---

The library is split into four packages so you only ship what you need. Pick one of the three quick-start paths below depending on your framework:

## Vanilla / non-framework projects

```bash
npm install @privion-consent/core @privion-consent/dom
```

Use the engine plus the DOM adapter that wires attributes like `<script type="privion">` and `[privion-banner]`. See the [vanilla quick start](/guides/quick-start-vanilla/).

## React

```bash
npm install @privion-consent/react
```

Pulls in `@privion-consent/core` transitively. Peer-dep on `react ^18.0.0`. See the [React quick start](/guides/quick-start-react/).

## Astro

```bash
npm install @privion-consent/astro @privion-consent/dom
```

Pulls in `@privion-consent/core` transitively. Peer-dep on `astro ^4.0.0`. The `@privion-consent/dom` direct dep is needed for the optional default stylesheet — drop it if you ship your own CSS. See the [Astro quick start](/guides/quick-start-astro/).

## Default styles (optional)

The bundled banner / preferences components are headless. Import the opt-in stylesheet from any binding for a working theme:

```ts
import '@privion-consent/dom/styles.css';
```

Themable via CSS custom properties — full list at [Default styles](/reference/styles/).
