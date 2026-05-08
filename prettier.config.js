// Bundled inline from @dreher-media/prettier-config. Public repos must keep
// shared configs self-contained; see decisions/0003 in the standards repo for
// the analogous workflow constraint and rationale.
//
// Source: https://github.com/Dreher-Media/standards/blob/main/configs/prettier-config/index.js
// If you change this, update the source first and propagate.

/** @type {import("prettier").Config} */
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: 'always',
  endOfLine: 'lf',
};
