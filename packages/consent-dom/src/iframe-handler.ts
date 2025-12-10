import type { PrivionConsent, ConsentState } from '@privion-consent/core'
import type { CategoryMatchMode } from './types.js'
import { parseCategories, areCategoriesAllowed } from './utils.js'

interface IframeElement {
  element: HTMLIFrameElement
  categories: string[]
  realSrc: string | null
  activated: boolean
}

/**
 * Handle iframe elements with privion-category
 */
export class IframeHandler {
  private consent: PrivionConsent
  private mode: CategoryMatchMode
  private iframes: Map<HTMLIFrameElement, IframeElement> = new Map()
  private unsubscribe: (() => void) | null = null

  constructor(consent: PrivionConsent, mode: CategoryMatchMode = 'any') {
    this.consent = consent
    this.mode = mode
  }

  /**
   * Initialize iframe handler
   */
  init(root: HTMLElement | Document = document): void {
    // Scan for existing iframes
    this.scanIframes(root)

    // Subscribe to consent updates
    this.unsubscribe = this.consent.on('update', (state) => {
      this.handleConsentUpdate(state)
    })

    // Also handle ready event
    this.consent.on('ready', (state) => {
      this.handleConsentUpdate(state)
    })
  }

  /**
   * Scan DOM for iframes with privion-category
   */
  private scanIframes(root: HTMLElement | Document): void {
    const iframes = root.querySelectorAll<HTMLIFrameElement>('iframe[privion-category]')

    for (const iframe of Array.from(iframes)) {
      if (!this.iframes.has(iframe)) {
        const categoryAttr = iframe.getAttribute('privion-category')
        const categories = parseCategories(categoryAttr)
        const realSrc = iframe.getAttribute('privion-src')

        this.iframes.set(iframe, {
          element: iframe,
          categories,
          realSrc,
          activated: false,
        })

        // Try to activate immediately if consent is already granted
        const state = this.consent.getState()
        if (areCategoriesAllowed(categories, state, this.mode) && realSrc) {
          this.activateIframe(iframe)
        }
      }
    }
  }

  /**
   * Handle consent state updates
   */
  private handleConsentUpdate(state: ConsentState): void {
    for (const [iframe, data] of this.iframes.entries()) {
      if (!data.activated && data.realSrc) {
        if (areCategoriesAllowed(data.categories, state, this.mode)) {
          this.activateIframe(iframe)
        }
      }
    }
  }

  /**
   * Activate an iframe by setting its src from privion-src
   */
  private activateIframe(iframe: HTMLIFrameElement): void {
    const data = this.iframes.get(iframe)
    if (!data || data.activated || !data.realSrc) {
      return
    }

    // Mark as activated
    data.activated = true

    // Set the real src (only once to avoid reloading)
    iframe.src = data.realSrc
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    this.iframes.clear()
  }
}
