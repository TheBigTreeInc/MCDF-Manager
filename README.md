# MCDF Manager

MCDF Manager is a desktop app for keeping, reviewing, and sharing MCDF character packages. It is built for people who want a clean local library, an easy way to browse shared entries, and a safer publishing flow when they choose to contribute to the community registry.

## Features

- Keep a local library of MCDF files.
- Add MCDFs from disk, Google Drive links, or direct HTTPS links.
- Review basic package details before adding an entry to your library.
- Add a display name, description, tags, 18+ marker, and preview image for your own library entries.
- Browse The Eorzea Exchange through the public registry index.
- Download public entries without registering.
- Register a profile when you want to publish, request access, report content, or use community services.
- Publish entries when connected with an authorized profile.

## Local-first design

Browsing, downloading, and local library management do not require an account. MCDF Manager stores your library state locally first. Registration is only needed for shared or community features such as publishing, access requests, reports, profile sync, and administration.

## Building from source

Requirements:

- Node.js 22+
- pnpm 9+
- Rust stable
- The Tauri prerequisites for your operating system

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

## Release builds

Client releases are built by GitHub Actions from this repository. Release artifacts are published as GitHub Release assets for Windows, macOS, and Linux.

## Privacy and safety

MCDF Manager should not expose raw storage locations for uploaded preview images, file parts, private administrative state, or internal blob locations in user-facing views. Public browsing should use the public registry index only.
