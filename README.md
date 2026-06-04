# MCDF Manager

MCDF Manager is a desktop library and registry browser for MCDF character packages. It keeps character files organized locally, connects to The Eorzea Exchange for public listings, and gives registered publishers a controlled flow for sharing entries with the community.

## What it does

- Adds MCDF files from disk, Google Drive links, and direct HTTPS links.
- Keeps a local library with names, descriptions, tags, 18+ markers, labels, and preview images.
- Shows detected package labels separately from user tags.
- Browses The Eorzea Exchange through the public registry index.
- Downloads public entries without registration.
- Keeps subscribed entries visible in the library, including entries that are no longer listed.
- Registers publisher profiles for publishing, reports, access requests, profile sync, and community services.
- Publishes updates through an authenticated profile.

## Local library

The library works without registration. Local entries stay on the computer until the user publishes them. Picture changes, titles, notes, tags, and 18+ markers are saved as local library metadata. The original MCDF file is not modified.

Library status uses two separate meanings:

- **Status** describes local availability, such as `local` or `subscribed`.
- **Public** describes Exchange visibility, such as `in index`, `not listed`, or `removed`.

## The Eorzea Exchange

The Eorzea Exchange is the public registry view. It reads public listing metadata, preview information, labels, and download options from the registry index. Browsing and downloading public entries do not require registration.

## Publishing

Publishing requires a registered profile. The publishing flow keeps a local entry editable first, then publishes the selected metadata and preview when the user chooses to share it.

## Releases

GitHub Actions builds release bundles for Windows, macOS, and Linux. Release assets are attached to tagged GitHub Releases.

Release tags for this repository use the `client-*` prefix.

## Building from source

Requirements:

- Node.js 22+
- pnpm 9+
- Rust stable
- Tauri prerequisites for the target operating system

Install dependencies:

```powershell
pnpm install --no-frozen-lockfile
```

Run the desktop app in development mode:

```powershell
pnpm tauri dev
```

Build a desktop release:

```powershell
pnpm tauri build
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## Privacy

MCDF Manager does not show private admin state, raw blob storage locations, internal file locations, or private repository details in user-facing screens. Public browsing uses the public registry index.
