import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrivionConsent } from '@privion-consent/core';
import type { PrivionConsentConfig } from '@privion-consent/core';
import { initPrivionDom, type PrivionDomHandle } from '../index.js';

const config: PrivionConsentConfig = {
  version: 1,
  storage: { type: 'localStorage' },
  categories: [
    { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
    { id: 'marketing', label: 'Marketing', defaultStatus: 'denied' },
  ],
};

describe('DOM adapter lifecycle', () => {
  let container: HTMLDivElement;
  let handle: PrivionDomHandle | null = null;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    handle?.destroy();
    handle = null;
    container.remove();
    vi.restoreAllMocks();
  });

  describe('button wiring', () => {
    it('wires every accept button, including ones added after init', () => {
      const consent = createPrivionConsent(config);
      container.innerHTML = `
        <div privion-banner><button privion-reject-all>No</button><button privion-accept-all>Yes</button></div>
        <div privion-preferences><div><button privion-accept-all id="second">Accept all</button></div></div>
      `;
      handle = initPrivionDom(consent, { root: container, reloadOnRevoke: false });

      container.querySelector<HTMLButtonElement>('#second')!.click();
      expect(consent.getState().categories.marketing).toBe('granted');

      consent.reset();
      const late = document.createElement('button');
      late.setAttribute('privion-accept-all', '');
      late.innerHTML = '<span>Load video</span>';
      container.appendChild(late);
      late.querySelector('span')!.click();
      expect(consent.getState().categories.marketing).toBe('granted');
      expect(consent.getState().userDecided).toBe(true);
    });

    it('records Save as a decision even when no switch changed', () => {
      const consent = createPrivionConsent(config);
      container.innerHTML = `
        <div privion-banner><button privion-open-preferences>Customize</button></div>
        <div privion-preferences><div>
          <input type="checkbox" privion-toggle="marketing" />
          <button privion-save-preferences>Save</button>
        </div></div>
      `;
      handle = initPrivionDom(consent, { root: container, reloadOnRevoke: false });

      container.querySelector<HTMLButtonElement>('[privion-open-preferences]')!.click();
      container.querySelector<HTMLButtonElement>('[privion-save-preferences]')!.click();

      expect(consent.getState().userDecided).toBe(true);
      expect(consent.getState().categories.marketing).toBe('denied');
      expect(localStorage.getItem('privion-consent')).not.toBeNull();
    });
  });

  describe('withdrawing consent', () => {
    it('unloads an activated iframe back to its placeholder src', () => {
      const consent = createPrivionConsent(config);
      container.innerHTML = `
        <iframe privion-category="marketing" privion-src="https://www.youtube-nocookie.com/embed/x" src="about:blank#placeholder"></iframe>
      `;
      handle = initPrivionDom(consent, { root: container, reloadOnRevoke: false });
      const iframe = container.querySelector('iframe')!;

      consent.acceptAll();
      expect(iframe.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/x');

      consent.rejectAll();
      expect(iframe.getAttribute('src')).toBe('about:blank#placeholder');

      consent.acceptAll();
      expect(iframe.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/x');
    });

    it('falls back to about:blank when the iframe had no src', () => {
      const consent = createPrivionConsent(config);
      container.innerHTML = `<iframe privion-category="marketing" privion-src="https://maps.example/x"></iframe>`;
      handle = initPrivionDom(consent, { root: container, reloadOnRevoke: false });
      consent.acceptAll();
      consent.rejectAll();
      expect(container.querySelector('iframe')!.getAttribute('src')).toBe('about:blank');
    });

    it('reloads once when consent for a script that ran is withdrawn', () => {
      const reload = vi.fn();
      vi.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        reload,
      } as Location);

      const consent = createPrivionConsent(config);
      container.innerHTML = `
        <script type="privion" privion-category="marketing">window.__a = 1;</script>
        <script type="privion" privion-category="marketing">window.__b = 1;</script>
      `;
      handle = initPrivionDom(consent, { root: container });

      consent.acceptAll();
      expect(reload).not.toHaveBeenCalled();
      consent.rejectAll();
      expect(reload).toHaveBeenCalledTimes(1);
      consent.acceptAll();
      consent.rejectAll();
      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('does not reload when no gated script had run, or when disabled', () => {
      const reload = vi.fn();
      vi.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        reload,
      } as Location);

      const consent = createPrivionConsent(config);
      container.innerHTML = `<script type="privion" privion-category="marketing">window.__c = 1;</script>`;
      handle = initPrivionDom(consent, { root: container, reloadOnRevoke: false });
      consent.rejectAll();
      consent.acceptAll();
      consent.rejectAll();
      expect(reload).not.toHaveBeenCalled();
    });
  });

  describe('script activation', () => {
    it('carries over integrity, crossorigin, referrerpolicy, data-* and the real type', () => {
      const consent = createPrivionConsent(config);
      container.innerHTML = `
        <script type="privion" privion-category="marketing" privion-type="module"
          src="https://cdn.example/widget.js" integrity="sha384-abc" crossorigin="anonymous"
          referrerpolicy="no-referrer" data-widget-id="42" id="widget"></script>
      `;
      handle = initPrivionDom(consent, { root: container, reloadOnRevoke: false });
      consent.acceptAll();

      const activated = container.querySelector<HTMLScriptElement>('script[type="module"]');
      expect(activated).not.toBeNull();
      expect(activated!.type).toBe('module');
      expect(activated!.getAttribute('src')).toBe('https://cdn.example/widget.js');
      expect(activated!.getAttribute('integrity')).toBe('sha384-abc');
      expect(activated!.getAttribute('crossorigin')).toBe('anonymous');
      expect(activated!.getAttribute('referrerpolicy')).toBe('no-referrer');
      expect(activated!.dataset.widgetId).toBe('42');
      expect(activated!.hasAttribute('privion-category')).toBe(false);
      expect(activated!.hasAttribute('privion-type')).toBe(false);
      // The id moved: it exists exactly once, on the script that runs.
      expect(container.querySelectorAll('[id="widget"]')).toHaveLength(1);
      expect(activated!.id).toBe('widget');
    });

    it('keeps execution order for scripts without async', () => {
      const consent = createPrivionConsent(config);
      container.innerHTML = `
        <script type="privion" privion-category="marketing" src="https://cdn.example/a.js"></script>
        <script type="privion" privion-category="marketing" src="https://cdn.example/b.js" async></script>
      `;
      handle = initPrivionDom(consent, { root: container, reloadOnRevoke: false });
      consent.acceptAll();

      const [a, b] = Array.from(
        container.querySelectorAll<HTMLScriptElement>('script:not([type="privion"])'),
      );
      expect(a!.async).toBe(false);
      expect(b!.async).toBe(true);
    });
  });
});
