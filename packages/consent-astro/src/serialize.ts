import type { PrivionConsentConfig } from '@privion-consent/core';

/**
 * Serialize a config for embedding inside a `<script type="application/json">`
 * element. Escapes `<`, `>`, `&` and the line separators U+2028/U+2029 as
 * `\uXXXX`, so no string in the config — a CMS-provided label, say — can
 * close the element. The output is still plain JSON.
 *
 * Functions (migrations, `backendSync` callbacks, a custom storage
 * adapter) do not survive serialization; pass those to `bootPrivion`
 * yourself if you need them.
 */
export function serializeConfig(config: PrivionConsentConfig): string {
  return JSON.stringify(config).replace(/[<>&\u2028\u2029]/g, (ch) => {
    return '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0');
  });
}
