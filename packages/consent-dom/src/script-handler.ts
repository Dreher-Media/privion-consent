import type { PrivionConsent, ConsentState } from '@privion-consent/core'
import type { CategoryMatchMode } from './types.js'
import { parseCategories, areCategoriesAllowed } from './utils.js'

interface ScriptElement {
  element: HTMLScriptElement
  categories: string[]
  activated: boolean
}

/**
 * Handle script elements with type="privion"
 */
export class ScriptHandler {
  private consent: PrivionConsent
  private mode: CategoryMatchMode
  private scripts: Map<HTMLScriptElement, ScriptElement> = new Map()
  private unsubscribe: (() => void) | null = null

  constructor(consent: PrivionConsent, mode: CategoryMatchMode = 'any') {
    this.consent = consent
    this.mode = mode
  }

  /**
   * Initialize script handler
   */
  init(root: HTMLElement | Document = document): void {
    // Scan for existing scripts
    this.scanScripts(root)

    // Subscribe to consent updates
    this.unsubscribe = this.consent.on('update', (state) => {
      this.handleConsentUpdate(state)
    })

    // Also handle ready event in case scripts are added before consent is ready
    this.consent.on('ready', (state) => {
      this.handleConsentUpdate(state)
    })
  }

  /**
   * Scan DOM for scripts with type="privion"
   */
  private scanScripts(root: HTMLElement | Document): void {
    const scripts = root.querySelectorAll<HTMLScriptElement>('script[type="privion"]')

    for (const script of Array.from(scripts)) {
      if (!this.scripts.has(script)) {
        const categoryAttr = script.getAttribute('privion-category')
        const categories = parseCategories(categoryAttr)

        this.scripts.set(script, {
          element: script,
          categories,
          activated: false,
        })

        // Try to activate immediately if consent is already granted
        const state = this.consent.getState()
        if (areCategoriesAllowed(categories, state, this.mode)) {
          this.activateScript(script)
        }
      }
    }
  }

  /**
   * Handle consent state updates
   */
  private handleConsentUpdate(state: ConsentState): void {
    for (const [script, data] of this.scripts.entries()) {
      if (!data.activated) {
        if (areCategoriesAllowed(data.categories, state, this.mode)) {
          this.activateScript(script)
        }
      }
    }
  }

  /**
   * Activate a script by creating a new executable script element
   */
  private activateScript(originalScript: HTMLScriptElement): void {
    const data = this.scripts.get(originalScript)
    if (!data || data.activated) {
      return
    }

    // Mark as activated
    data.activated = true

    // Create new script element
    const newScript = document.createElement('script')

    // Copy attributes
    if (originalScript.src) {
      newScript.src = originalScript.src
    } else if (originalScript.textContent) {
      newScript.textContent = originalScript.textContent
    }

    // Copy other attributes
    if (originalScript.async) {
      newScript.async = true
    }
    if (originalScript.defer) {
      newScript.defer = true
    }
    if (originalScript.nonce) {
      newScript.nonce = originalScript.nonce
    }
    if (originalScript.crossOrigin) {
      newScript.crossOrigin = originalScript.crossOrigin
    }

    // Insert into DOM (prefer after original, fallback to head or body)
    const insertAfter = originalScript.nextSibling
    const parent = originalScript.parentNode

    if (parent) {
      if (insertAfter) {
        parent.insertBefore(newScript, insertAfter)
      } else {
        parent.appendChild(newScript)
      }
    } else {
      // Fallback: append to head or body
      const target = document.head || document.body
      if (target) {
        target.appendChild(newScript)
      }
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    this.scripts.clear()
  }
}
