# Release Process

This project uses [Changesets](https://github.com/changesets/changesets) for version management and npm publishing.

## Making Changes

1. **Make your changes** to the codebase
2. **Create a changeset** describing your changes:

   ```bash
   pnpm changeset
   ```

   This will prompt you to:

   - Select which packages are affected
   - Choose the type of change (major, minor, patch)
   - Write a description of the changes

3. **Commit your changes** including the changeset file

## Releasing

### Automatic Release (via GitHub Actions)

When changes are merged to `main`, the GitHub Actions workflow will:

1. Build all packages
2. Create a version PR with updated versions
3. Once the version PR is merged, publish to npm

### Manual Release

If you need to release manually:

1. **Version packages** (updates package.json versions and creates changelogs):

   ```bash
   pnpm version-packages
   ```

2. **Review the changes** in the generated CHANGELOG files

3. **Publish to npm**:

   ```bash
   pnpm release
   ```

   This will:

   - Build all packages
   - Publish changed packages to npm

## NPM Token Setup

For publishing to work, you need to set up an NPM_TOKEN secret in GitHub:

1. Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Create a new "Automation" token
3. Add it as a secret named `NPM_TOKEN` in your GitHub repository settings

## Package Access

All packages are published as public packages under the `@privion-consent` scope:

- `@privion-consent/core`
- `@privion-consent/dom`
- `@privion-consent/react`

Make sure you have access to publish to this scope on npm.
