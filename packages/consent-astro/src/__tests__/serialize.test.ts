import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { serializeConfig } from '../serialize.js';
import type { PrivionConsentConfig } from '@privion-consent/core';

const hostile: PrivionConsentConfig = {
  version: 1,
  categories: [
    {
      id: 'marketing',
      label: 'Media</script><script>window.__pwned = true</script>',
      description: 'a & b <!-- c --> \u2028 d',
    },
  ],
};

describe('serializeConfig', () => {
  it('cannot close the surrounding <script> element', () => {
    const json = serializeConfig(hostile);
    expect(json).not.toMatch(/[<>&\u2028\u2029]/);
  });

  it('round-trips to the same config through JSON.parse', () => {
    expect(JSON.parse(serializeConfig(hostile))).toEqual(hostile);
  });

  it('keeps a hostile label inert when embedded the way PrivionScript does', () => {
    const html = `<script id="privion-config" type="application/json">${serializeConfig(hostile)}</script>`;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelectorAll('script')).toHaveLength(1);
    const parsed = JSON.parse(doc.getElementById('privion-config')!.textContent!);
    expect(parsed.categories[0].label).toBe(hostile.categories[0]!.label);
  });

  it('is what PrivionScript.astro embeds', () => {
    const source = readFileSync(resolve('src/PrivionScript.astro'), 'utf8');
    expect(source).toMatch(/serializeConfig\(config\)/);
    expect(source).not.toMatch(/JSON\.stringify\(config\)/);
  });
});
