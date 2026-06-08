# Release policy

MCDF Manager publishes desktop packages only when the packaged application changes.

Automatic releases on `main` are limited to changes in:

- `src/**`
- `src-tauri/**`
- `public/**`
- `index.html`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `vite.config.ts`
- `tsconfig.json`
- `tsconfig.node.json`
- `tailwind.config.js`
- `postcss.config.js`

Documentation, screenshots, branding images, helper scripts, changelog-only updates, and GitHub repository content should not create a new desktop release by themselves.

When a later application change is released, the tag is created from the current commit, so earlier documentation commits are still included in the repository history without producing unnecessary binary packages.

Manual `workflow_dispatch` releases are still available when a maintainer intentionally wants to publish from the current commit.
