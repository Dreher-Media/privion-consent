# Examples

This directory contains example implementations of Privion Consent.

## Vanilla HTML Example

The `vanilla.html` file demonstrates:

- Consent banner and preferences UI
- Script blocking (Google Analytics)
- Iframe blocking (YouTube embed)
- Element visibility control

### Running the Example

1. Build the packages:

   ```bash
   pnpm build
   ```

2. Serve the example file using a local server (required for ES modules):

   ```bash
   # Using Python
   python3 -m http.server 8000

   # Using Node.js (npx)
   npx serve examples

   # Using PHP
   php -S localhost:8000 -t examples
   ```

3. Open `http://localhost:8000/vanilla.html` in your browser

4. Open browser DevTools to see:
   - Console logs of consent state changes
   - Network tab to verify scripts/iframes are blocked until consent

## Testing

Run the test suite:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests for a specific package
pnpm --filter @privion-consent/core test
pnpm --filter @privion-consent/dom test
pnpm --filter @privion-consent/react test
```

## Manual Testing Checklist

- [ ] Banner appears on first visit
- [ ] Accept all grants all categories
- [ ] Reject all denies all optional categories
- [ ] Preferences dialog opens and saves correctly
- [ ] Scripts don't execute until consent is granted
- [ ] Iframes don't load until consent is granted
- [ ] Element visibility changes based on consent
- [ ] Consent persists across page reloads
- [ ] Version changes invalidate old consent
