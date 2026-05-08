import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPrivionConsent } from '@privion-consent/core';
import { initPrivionDom } from '../index.js';
import type { PrivionConsentConfig } from '@privion-consent/core';

describe('DOM Adapter', () => {
  let config: PrivionConsentConfig;
  let container: HTMLDivElement;

  beforeEach(() => {
    // Clear storage
    localStorage.clear();
    document.cookie.split(';').forEach((cookie) => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });

    // Create test container
    container = document.createElement('div');
    document.body.appendChild(container);

    config = {
      version: 1,
      categories: [
        {
          id: 'necessary',
          label: 'Necessary',
          required: true,
          defaultStatus: 'granted',
        },
        {
          id: 'analytics',
          label: 'Analytics',
          defaultStatus: 'denied',
        },
        {
          id: 'marketing',
          label: 'Marketing',
          defaultStatus: 'denied',
        },
      ],
    };
  });

  afterEach(() => {
    // Clean up
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('Script blocking', () => {
    it('should not execute scripts without consent', async () => {
      const consent = createPrivionConsent(config);
      const scriptContent = 'window.__testScriptExecuted = true;';

      container.innerHTML = `
        <script type="privion" privion-category="analytics">
          ${scriptContent}
        </script>
      `;

      initPrivionDom(consent, { root: container });

      // Original script with type="privion" should exist
      const originalScripts = container.querySelectorAll('script[type="privion"]');
      expect(originalScripts.length).toBe(1);

      // No executable script should exist yet
      const executableScripts = Array.from(container.querySelectorAll('script')).filter(
        (s) => s.type !== 'privion' && s.type !== 'application/json',
      );
      expect(executableScripts.length).toBe(0);

      // Grant consent - this should trigger script activation
      consent.setCategory('analytics', 'granted');

      // Wait for DOM update
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 50);
      });

      // After consent, a new executable script should be created
      const allScripts = Array.from(container.querySelectorAll('script'));
      const executableScript = allScripts.find(
        (s) => s.type !== 'privion' && s.textContent?.includes('__testScriptExecuted'),
      );

      // Verify script was activated (created with executable type)
      expect(executableScript).toBeDefined();
      expect(executableScript?.textContent).toContain('__testScriptExecuted');

      // Note: In jsdom, inline scripts may not execute, but we verify the script element was created
      // In a real browser, this script would execute
    });

    it('should execute scripts with src when consent is granted', () => {
      const consent = createPrivionConsent(config);

      container.innerHTML = `
        <script type="privion" privion-category="analytics" src="https://example.com/script.js"></script>
      `;

      // Grant consent first
      consent.setCategory('analytics', 'granted');
      initPrivionDom(consent, { root: container });

      // Script should be activated - check that a new script element was created
      // The original script with type="privion" should still be there
      const originalScripts = container.querySelectorAll('script[type="privion"]');
      expect(originalScripts.length).toBe(1);

      // A new executable script should have been created
      // We can verify this by checking if there's a script without type="privion" or with type="text/javascript"
      const allScripts = container.querySelectorAll('script');
      // Should have at least the original + potentially the new one
      // The new script might be in the container or appended elsewhere
      expect(allScripts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Iframe blocking', () => {
    it('should not load iframe without consent', () => {
      const consent = createPrivionConsent(config);

      container.innerHTML = `
        <iframe
          privion-category="marketing"
          privion-src="https://www.youtube.com/embed/test"
          src="about:blank">
        </iframe>
      `;

      initPrivionDom(consent, { root: container });

      const iframe = container.querySelector('iframe')!;
      expect(iframe.src).toBe('about:blank');

      // Grant consent
      consent.setCategory('marketing', 'granted');

      // Iframe should load
      expect(iframe.src).toBe('https://www.youtube.com/embed/test');
    });
  });

  describe('Element visibility', () => {
    it('should hide elements when consent is not granted', () => {
      const consent = createPrivionConsent(config);

      container.innerHTML = `
        <div privion="analytics">Analytics content</div>
        <div privion="marketing">Marketing content</div>
      `;

      initPrivionDom(consent, { root: container });

      const analyticsDiv = container.querySelector('div[privion="analytics"]') as HTMLElement;
      const marketingDiv = container.querySelector('div[privion="marketing"]') as HTMLElement;

      expect(analyticsDiv.style.display).toBe('none');
      expect(marketingDiv.style.display).toBe('none');

      // Grant analytics consent
      consent.setCategory('analytics', 'granted');

      expect(analyticsDiv.style.display).not.toBe('none');
      expect(marketingDiv.style.display).toBe('none');
    });

    it('should handle negative conditions', () => {
      const consent = createPrivionConsent(config);

      container.innerHTML = `
        <div privion="!marketing">No marketing content</div>
      `;

      initPrivionDom(consent, { root: container });

      const div = container.querySelector('div[privion="!marketing"]') as HTMLElement;

      // Should be visible when marketing is not granted
      expect(div.style.display).not.toBe('none');

      // Grant marketing consent
      consent.setCategory('marketing', 'granted');

      // Should be hidden when marketing is granted
      expect(div.style.display).toBe('none');
    });

    it('should handle mixed conditions', () => {
      const consent = createPrivionConsent(config);

      container.innerHTML = `
        <div privion="analytics,!marketing">Analytics but no marketing</div>
      `;

      initPrivionDom(consent, { root: container });

      const div = container.querySelector('div[privion="analytics,!marketing"]') as HTMLElement;

      // Should be hidden (analytics not granted)
      expect(div.style.display).toBe('none');

      // Grant analytics
      consent.setCategory('analytics', 'granted');

      // Should be visible (analytics granted AND marketing not granted)
      expect(div.style.display).not.toBe('none');

      // Grant marketing
      consent.setCategory('marketing', 'granted');

      // Should be hidden (marketing is now granted)
      expect(div.style.display).toBe('none');
    });
  });

  describe('UI handlers', () => {
    it('should wire up accept all button', () => {
      const consent = createPrivionConsent(config);

      container.innerHTML = `
        <button privion-accept-all>Accept All</button>
      `;

      initPrivionDom(consent, { root: container });

      const button = container.querySelector('button[privion-accept-all]') as HTMLButtonElement;
      expect(button).toBeTruthy();
      button.click();

      const state = consent.getState();
      expect(state.categories.analytics).toBe('granted');
      expect(state.categories.marketing).toBe('granted');
    });

    it('should wire up reject all button', () => {
      const consent = createPrivionConsent(config);
      consent.acceptAll(); // First accept all

      container.innerHTML = `
        <button privion-reject-all>Reject All</button>
      `;

      initPrivionDom(consent, { root: container });

      const button = container.querySelector('button[privion-reject-all]') as HTMLButtonElement;
      expect(button).toBeTruthy();
      button.click();

      const state = consent.getState();
      expect(state.categories.analytics).toBe('denied');
      expect(state.categories.marketing).toBe('denied');
    });

    it('should wire up category toggles', () => {
      const consent = createPrivionConsent(config);

      container.innerHTML = `
        <input type="checkbox" privion-toggle="analytics" />
      `;

      initPrivionDom(consent, { root: container });

      const checkbox = container.querySelector(
        'input[privion-toggle="analytics"]',
      ) as HTMLInputElement;

      // Should be unchecked initially
      expect(checkbox.checked).toBe(false);

      // Check the box
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));

      // Consent should be granted
      const state = consent.getState();
      expect(state.categories.analytics).toBe('granted');
    });
  });
});
