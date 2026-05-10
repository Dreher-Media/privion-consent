import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createPrivionConsent, type PrivionConsentConfig } from '@privion-consent/core';
import { initPrivionDom } from '../index.js';

const config: PrivionConsentConfig = {
  version: 1,
  categories: [
    { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
    { id: 'analytics', label: 'Analytics', defaultStatus: 'denied' },
    { id: 'marketing', label: 'Marketing', defaultStatus: 'denied' },
  ],
};

let container: HTMLDivElement;
let activeHandles: Array<{ destroy: () => void }> = [];

beforeEach(() => {
  localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  // Tear down each handle so its MutationObserver doesn't keep
  // matching DOM mutations from the next test.
  for (const handle of activeHandles) handle.destroy();
  activeHandles = [];
  container.remove();
});

function setup(consent: ReturnType<typeof createPrivionConsent>) {
  const handle = initPrivionDom(consent);
  activeHandles.push(handle);
  return handle;
}

/**
 * MutationObserver callbacks are async (queued as microtasks). Tests
 * yield once after each DOM mutation so the handler has a chance to
 * pick the change up before assertions run.
 */
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Late-injection support (MutationObserver)', () => {
  it('activates a script injected after init when the category is granted', async () => {
    const consent = createPrivionConsent(config);
    setup(consent);
    consent.acceptAll();

    // Inject a privion script *after* init + accept.
    const scriptEl = document.createElement('script');
    scriptEl.setAttribute('type', 'privion');
    scriptEl.setAttribute('privion-category', 'analytics');
    scriptEl.setAttribute('src', 'https://example.com/late.js');
    container.appendChild(scriptEl);

    await flushMicrotasks();

    // The handler should have inserted an executable clone right
    // after the original (non-executable) script.
    const next = scriptEl.nextSibling as HTMLScriptElement | null;
    expect(next).not.toBeNull();
    expect(next?.tagName).toBe('SCRIPT');
    expect(next?.getAttribute('type')).toBeNull(); // executable, no `type="privion"`
    expect(next?.src).toBe('https://example.com/late.js');
  });

  it('keeps a late-injected script blocked until consent is granted', async () => {
    const consent = createPrivionConsent(config);
    setup(consent);

    const scriptEl = document.createElement('script');
    scriptEl.setAttribute('type', 'privion');
    scriptEl.setAttribute('privion-category', 'analytics');
    scriptEl.setAttribute('src', 'https://example.com/late.js');
    container.appendChild(scriptEl);

    await flushMicrotasks();

    // Not granted yet → no executable clone.
    expect(scriptEl.nextSibling).toBeNull();

    consent.setCategory('analytics', 'granted', 'preferences');

    // Now the consent update should activate the late-injected script.
    const next = scriptEl.nextSibling as HTMLScriptElement | null;
    expect(next?.src).toBe('https://example.com/late.js');
  });

  it('activates a late-injected iframe when consent is already granted', async () => {
    const consent = createPrivionConsent(config);
    setup(consent);
    consent.acceptAll();

    const iframe = document.createElement('iframe');
    iframe.setAttribute('privion-category', 'marketing');
    iframe.setAttribute('privion-src', 'https://example.com/embed');
    iframe.src = 'about:blank';
    container.appendChild(iframe);

    await flushMicrotasks();

    expect(iframe.src).toBe('https://example.com/embed');
  });

  it('applies visibility to a late-injected `[privion]` element', async () => {
    const consent = createPrivionConsent(config);
    setup(consent);

    // Marketing is denied by default → element should be hidden.
    const div = document.createElement('div');
    div.setAttribute('privion', 'marketing');
    div.textContent = 'late';
    container.appendChild(div);

    await flushMicrotasks();
    expect(div.style.display).toBe('none');

    consent.setCategory('marketing', 'granted', 'preferences');
    expect(div.style.display).not.toBe('none');
  });

  it('handles a deep insertion (subtree change rather than direct child)', async () => {
    const consent = createPrivionConsent(config);
    setup(consent);
    consent.acceptAll();

    // Append a wrapper first; then drop a privion script inside it.
    const wrapper = document.createElement('section');
    container.appendChild(wrapper);
    await flushMicrotasks();

    const scriptEl = document.createElement('script');
    scriptEl.setAttribute('type', 'privion');
    scriptEl.setAttribute('privion-category', 'analytics');
    scriptEl.setAttribute('src', 'https://example.com/deep.js');
    wrapper.appendChild(scriptEl);

    await flushMicrotasks();

    const next = scriptEl.nextSibling as HTMLScriptElement | null;
    expect(next?.src).toBe('https://example.com/deep.js');
  });

  it('handles a subtree where the privion element is itself the inserted root', async () => {
    const consent = createPrivionConsent(config);
    setup(consent);
    consent.acceptAll();

    // The added node IS the privion element (no descendants involved).
    const scriptEl = document.createElement('script');
    scriptEl.setAttribute('type', 'privion');
    scriptEl.setAttribute('privion-category', 'analytics');
    scriptEl.setAttribute('src', 'https://example.com/root.js');
    container.appendChild(scriptEl);

    await flushMicrotasks();

    const next = scriptEl.nextSibling as HTMLScriptElement | null;
    expect(next?.src).toBe('https://example.com/root.js');
  });
});
