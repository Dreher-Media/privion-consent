import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// `ConsentPreferences.astro` is shipped verbatim (`cp src/*.astro dist/`), so
// asserting against the template source is asserting against the artifact
// consumers receive. Astro's Container API can't run under the repo's pinned
// Vitest/Vite, so we strip the frontmatter and parse the remaining markup with
// jsdom (the configured test environment) to inspect the DOM structure.
// Vitest runs with the package directory as the working directory.
const source = readFileSync(resolve('src/ConsentPreferences.astro'), 'utf8');

function parseTemplate(astro: string): Document {
  // Drop the leading `---` frontmatter fence and its contents.
  const template = astro.replace(/^---[\s\S]*?---/, '');
  return new DOMParser().parseFromString(template, 'text/html');
}

describe('ConsentPreferences.astro template', () => {
  const modal = parseTemplate(source).querySelector('[privion-preferences]');

  it('renders a preferences modal that is hidden by default', () => {
    expect(modal).not.toBeNull();
    expect(modal!.hasAttribute('hidden')).toBe(true);
  });

  it('wraps the modal contents in a single panel child', () => {
    // Regression guard for the flat-children bug: emitting the heading, slot
    // and save button as direct siblings of `[privion-preferences]` makes the
    // default `[privion-preferences] > *` stylesheet rule style each one as a
    // separate card. They must live inside one wrapper element.
    expect(modal!.children).toHaveLength(1);

    const panel = modal!.firstElementChild;
    expect(panel).not.toBeNull();
    expect(panel!.querySelector('h2')).not.toBeNull();
    expect(panel!.querySelector('slot')).not.toBeNull();
    expect(panel!.querySelector('[privion-save-preferences]')).not.toBeNull();
  });
});
