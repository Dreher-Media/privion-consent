import type { ConsentStatus, ConsentState } from '@privion-consent/core';
import type { CategoryMatchMode } from './types.js';

/**
 * Parse category string into array of category IDs
 * Supports comma and/or whitespace separated values
 */
export function parseCategories(categoryString: string | null): string[] {
  if (!categoryString) {
    return [];
  }

  return categoryString
    .split(/[,\s]+/)
    .map((cat) => cat.trim())
    .filter((cat) => cat.length > 0);
}

/**
 * Check if categories are allowed based on consent state
 */
export function areCategoriesAllowed(
  categories: string[],
  state: ConsentState,
  mode: CategoryMatchMode = 'any',
): boolean {
  if (categories.length === 0) {
    return false;
  }

  if (mode === 'any') {
    // At least one category must be granted
    return categories.some((cat) => state.categories[cat] === 'granted');
  } else {
    // All categories must be granted
    return categories.every((cat) => state.categories[cat] === 'granted');
  }
}

/**
 * Parse privion attribute expression and compute visibility
 */
export function computeVisibility(expression: string | null, state: ConsentState): boolean {
  if (!expression) {
    return true;
  }

  const tokens = parseCategories(expression);
  const positives: string[] = [];
  const negatives: string[] = [];

  for (const token of tokens) {
    if (token.startsWith('!')) {
      negatives.push(token.slice(1));
    } else {
      positives.push(token);
    }
  }

  // Check positive conditions
  let visibleByPositives = true;
  if (positives.length > 0) {
    visibleByPositives = positives.some((cat) => state.categories[cat] === 'granted');
  }

  // Check negative conditions
  let visibleByNegatives = true;
  if (negatives.length > 0) {
    // Visible if ANY negative category is NOT granted
    visibleByNegatives = negatives.some((cat) => state.categories[cat] !== 'granted');
  }

  return visibleByPositives && visibleByNegatives;
}
