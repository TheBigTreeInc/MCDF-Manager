# MCDF Manager

MCDF Manager is a desktop library and registry browser for MCDF character packages. It keeps character files organized locally, connects to The Eorzea Exchange for public listings, and gives registered publishers a controlled flow for sharing entries with the community.

### Fixed registry endpoint

MCDF Manager connects to the public registry at `http://mcdf.thebigtree.life:48443`. The endpoint is fixed in this public client build and is not user-configurable. Legacy local settings and imported auth packages cannot switch the client back to `localhost` or `127.0.0.1`.

The desktop shell also blocks browser/WebView function-key shortcuts inside the app window. F keys do not trigger browser help, refresh, caret browsing, fullscreen, or developer actions while using MCDF Manager.


## Visual style

The top-bar page title uses the `Mythgrove` serif typeface when it is available on the system or supplied by a licensed build asset. MCDF Manager falls back to Fantasy Magist, decorative serif fonts, and then standard serif fonts when Mythgrove is not available.

Licensed builds can place the font files at:

```text
public/fonts/MythgroveRegular.otf
public/fonts/MythgroveSlanted.otf
```

## What it does

- Adds MCDF files from disk, Google Drive links, and direct HTTPS links.
- Keeps a local library with names, descriptions, tags, 18+ markers, labels, and preview images.
- Shows detected package labels separately from user tags.
- Browses The Eorzea Exchange through the public registry index.
- Downloads public entries without registration.
- Exports local MCDF files back out of the library.
- Shares public Exchange entries through a copied share reference.
- Keeps subscribed entries visible in the library, including entries that are no longer listed.
- Registers publisher profiles for publishing, reports, access requests, profile sync, and community services.
- Publishes updates through an authenticated profile.

## Local library

The library works without registration. Local entries stay on the computer until the user publishes them. Picture changes, titles, notes, tags, and 18+ markers are saved as local library metadata. The original MCDF file is not modified.

Image picker and preview upload errors show a short readable message first. The underlined `details` link opens the full technical error in a modal so users can report the exact failure without the main page overflowing or filling with raw builder text.

When you choose or change a preview image, MCDF Manager copies that image into the local library preview cache and stores the cached path on the entry. The preview remains attached even if the original image is moved or deleted later. The app enables its local preview asset scope so cached library images can be displayed inside the desktop UI. The preview framing modal supports mouse wheel zoom, in-frame arrow nudges, and direct drag positioning with a four-way move cursor so the image can be framed quickly before applying it.

Library status uses two separate meanings:

- **Status** describes local availability, such as `local` or `subscribed`.
- **Public** describes Exchange visibility, such as `in index`, `not listed`, or `removed`.

Library entries group their main actions together: share a public Exchange reference, export or download the MCDF, publish the entry, or remove it from the local library. Moderation checks are enforced by the registry during publishing. Admin users can refresh a selected entry against the moderation blocklist from the entry detail panel.

## The Eorzea Exchange

The Eorzea Exchange is the public registry view. It reads public listing metadata, preview information, labels, and download options from the registry index. Browsing and downloading public entries do not require registration.

## Publishing

Publishing requires a registered profile. The publishing flow keeps a local entry editable first, then publishes the selected metadata and preview when the user chooses to share it.

## Creator and moderator hash protection

MCDF Manager supports moderation blocks for package hashes and individual layer/file BLAKE3 hashes. A moderator can mark hashes as restricted, blocked by policy, or potentially illegal from the Admin moderation blocklist. Local library entries remain available on the user's computer, but entries with blocked matches cannot be uploaded or shared through MCDF Manager.

Library list view shows the sharing classification and the package or file that caused the block. The check uses stored BLAKE3 hashes and does not upload MCDF bytes.

Mod creators and rights holders can provide BLAKE3 hashes for review. Approved hashes are added by moderators to the blocklist, which prevents future publishing or vault upload of matching files.


## Configuration and auto-import

MCDF Manager stores local settings in a JSON config file. The Settings page shows the active config file and lets you choose an existing config file without an overwrite prompt. Saving Settings writes the selected folders and preferences into that config file. Advanced launches can also set `MCDF_MANAGER_HOME` for the app home directory or `MCDF_MANAGER_CONFIG` for the exact config file.

Auto-import watched folders automatically add newly placed `.mcdf` files to your library while MCDF Manager is open. You can still import MCDF files from anywhere with Add MCDF or Analyze MCDF; watched folders are only for hands-free intake of new packages. The Library page also includes a manual scan action for immediate refreshes. New packages are added with metadata, file inventory, and BLAKE3 hashes.

## Admin ownership tools

Admin users can move a published Exchange entry to a different owner from the Admin area. This supports migrations, creator corrections, and moderation actions where a package needs to be attached to a different registered account.

## Releases

GitHub Actions builds official MCDF Manager desktop bundles for Windows, macOS, and Linux. Release assets use product names, platform names, and the client version. Each release also includes:

- `checksums.txt` with SHA-256 hashes for the downloadable bundles;
- `release-manifest.json` with product, version, tag, commit, build time, asset sizes, and hashes;


Main branch prereleases use the same generated files as tagged releases. The release manifest step is safe to run through `pnpm run` and writes metadata for the platform zips in `packaged-assets/`.
- release notes generated from the latest `CHANGELOG.md` entry.

Main branch pushes create prerelease GitHub Releases with generated desktop assets. These releases use automatic tags such as `client-main-124`. The asset version uses the package version plus the GitHub Actions run number, such as `0.1.0-main.124`. Official public releases use `client-v<version>` tags and require that version to match `package.json` and `CHANGELOG.md`.

## Client release pipeline

The public client repository separates validation builds from public releases.

- Pull requests and main branch pushes run Client CI.
- CI builds the frontend, validates public product text, checks the changelog, and runs `cargo check` for the Tauri/Rust command layer.
- Main branch pushes run the release workflow and publish prerelease assets automatically.
- Manual temporary build artifacts are available through the build workflow.
- Official public releases use `client-v<version>` tags.
- Official release versions come from the tag and must match `package.json`.
- Main branch prerelease versions use `<package version>-main.<run number>` and do not require a matching changelog version heading.
- Release notes are generated by `scripts/generate-release-notes.mjs` from the latest changelog entry.
- Release metadata is written by `scripts/write-release-manifest.mjs`.

Official release assets use these names:

```text
MCDF-Manager-Windows-x86_64-v0.1.0.zip
MCDF-Manager-Linux-x86_64-v0.1.0.zip
MCDF-Manager-macOS-Apple-Silicon-v0.1.0.zip
MCDF-Manager-macOS-Intel-v0.1.0.zip
checksums.txt
release-manifest.json
```

Before creating a new official public release, update `package.json` and add a matching changelog entry for the release version. Main branch prereleases are generated automatically from the current package version and run number.

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

## Changelog and bug reports

See [CHANGELOG.md](CHANGELOG.md) for release history, fixed bugs, and known follow-up work.

Use GitHub Issues to report bugs. The bug report template asks for reproduction steps, MCDF Manager version, platform, and logs or screenshots.

## Privacy

MCDF Manager does not show private admin state, raw blob storage locations, internal file locations, or private repository details in user-facing screens. Public browsing uses the public registry index.

### Library sharing status

The Library list view focuses on upload/share readiness. Entries that can be shared use a quiet `Can share` state. Entries blocked by moderation show a strong `Disallowed` state and the `Blocking file` column names the package or internal file hash that prevents upload. Local/on-device storage is kept out of the main status path so the list does not repeat the same local/not-listed wording across multiple columns.

### Analyze MCDF layout

Analyze MCDF opens the file picker directly from the sidebar and keeps a compact action bar visible on the page. The action bar can analyze another MCDF, check registry hashes, or import the inspected MCDF into the local library without publishing it.

After a file is selected, the page shows package notes, component groups, and the internal file inventory. Registry status is tri-state: before the online check runs, file rows show `not checked`; after the check, they show whether the BLAKE3 payload hash is known in the registry or missing. Long game paths and BLAKE3 hashes wrap or appear in hover text so the inspection view stays readable without horizontal scrolling.

Large MCDF files take longer to open because the client safely reads archive metadata and calculates internal payload hashes. The native analyzer opens the package once for metadata and file inventory, reducing duplicate parsing work.

### Selective registry upload

MCDF Manager keeps a decoded package buffer in memory while it builds the internal file inventory. Each internal file stores its path, size, BLAKE3 hash, and offset inside that decoded package. When publishing, the client sends the hash manifest to the registry first. The registry replies with known, missing, and blocked hashes. The client uploads only the missing allowed file slices requested by the registry. Known files stay referenced by hash and are not uploaded again.

## fix121 compile fix

This source package fixes the RAM-slice selective upload build error in the Tauri command layer. The selective upload model remains the same: MCDF Manager parses the package once, keeps decoded package data available to address internal file slices, and uploads only registry-missing slices during publishing.


Latest UI polish: `fix131-settings-form-unification` makes Settings use one compact form style and reduces input corner radius.

## fix148 — Error log compile fix

The actionable publish/preview error details now use escaped newline text so Vite can parse the React source while the modal still shows a readable structured error log.


## Add MCDF review polish

The Add MCDF review step now keeps the local/publish wording clear, shows detected package information in a compact table, and uses a cleaner 18+ control that matches the rest of the form.

### Add MCDF preview image handling

Preview images selected while adding an MCDF are copied into the MCDF Manager preview cache before the library entry is saved. The entry keeps its picture even when the original image file is moved or deleted.



## fix138 — Integrated wheel preview framing

The preview framing modal now keeps the controls inside the image frame itself. Use the mouse wheel over the picture to zoom, use the four arrow buttons on the frame to move the image, then press **Apply picture frame** to confirm the crop. The extra explanatory text under the modal title has been removed.

## fix137 — Integrated preview framing modal

- Add MCDF preview framing now opens as an interactive modal from the image box.
- Crop changes are confirmed with an Apply button instead of changing the form layout.
- Library entry previews use the same framing modal for consistent image adjustment.

## fix136 — Preview framing controls

Add MCDF preview images now use a stable portrait frame. After choosing a picture, use the preview framing controls to adjust zoom and position before adding the entry to the library. The saved framing is reused in the library card and detail views.

### Preview image framing

The Add MCDF and library preview tools include an interactive Frame picture modal. Drag the image inside the frame to reposition it, use the mouse wheel to zoom, then choose Apply picture frame to save the crop with the entry.



## Migrating an existing publisher identity

Use a `.mcdfauth` package to move an existing publisher identity to a new MCDF Manager install. The package contains the private key, public key, and server-issued certificate for that publisher identity. Keep it private.

If you still have an old config or local-storage export, build the migration package with:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Build-MCDFAuthFromLegacyConfig.ps1 `
  -ConfigPath "$env:USERPROFILE\.mcdf-manager\old-config.json" `
  -OutputPath "$env:USERPROFILE\Desktop\my-profile.mcdfauth"
```

If the old config used different names, pass the values explicitly:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Build-MCDFAuthFromLegacyConfig.ps1 `
  -OutputPath "$env:USERPROFILE\Desktop\my-profile.mcdfauth" `
  -PublisherId my-name `
  -DisplayName "My Name" `
  -PublicKey "<base64 spki>" `
  -PrivateKey "<base64 pkcs8>" `
  -Certificate "<pem certificate>"
```

Import the package in MCDF Manager from **Register new account → Import**.

The public publisher profile belongs to the registry server. MCDF Manager keeps a local identity cache so it can sign requests, show the current identity, and export a migration package for another install.


## fix145-navigation-and-preview-publish-error

- Navigation labels use **Library** and **Analyze**.
- Compatibility publishing avoids oversized metadata headers when preview images are present, preventing the generic builder error during upload.


### Token and error detail polish

Settings keeps the server token editor visible until the token is saved. After a successful save the Admin pane becomes available immediately. Error details open in a better aligned modal with the short message at the top and the raw diagnostic text below.

### Error details

MCDF Manager shows a short error first and keeps the full diagnostic log behind an underlined **details** action. Publish and preview-image failures include the failed step, a likely cause, suggested next actions, and raw technical details for debugging.



## Publish diagnostics

MCDF Manager error details include the publish step, registry URL, preview path, token state, and publisher identity state when a publish request fails. Multiline publisher certificates are sent through a header-safe compatibility field so local HTTP request construction errors can be diagnosed instead of appearing only as `builder error`.


### Publish upload URL recovery

MCDF Manager uses the configured registry server origin for missing-file uploads when a registry response accidentally contains a localhost upload link. This keeps remote publishing pointed at the public registry instead of the local PC.

### Publish URL hardening

MCDF Manager builds upload and job-polling requests from the configured registry URL. If an older registry response contains a localhost upload link, the client keeps using the configured remote registry origin.



## fix153 notes

- Library details open as an overlay drawer so the list stays in place while you inspect an MCDF.
- Tag folders let you turn tags into lightweight library groups without changing where files live on disk.
- Finished transfers clean themselves up from the activity menu.
- Published Exchange entries can show the preview image stored in the public index.


### Share-code import and layer recovery

MCDF Manager share actions copy compact references such as `mcdf.thebigtree.life:<id>`. The client treats these as share codes, not browser URLs. The Add MCDF modal can import one or many share codes and optionally apply one tag to all imported entries.

Library details expose the internal file inventory through the clickable file count. For local MCDF entries, individual internal files can be exported back to the machine for recovery or reuse.

## Offline and degraded service state

MCDF Manager keeps local library and Analyze workflows available when the registry or public Exchange index cannot be reached. When remote services are unavailable, the top bar shows a red or amber status badge next to the Add button. Publishing, registry hash checks, share-code import, and Exchange refresh actions depend on the registry and public index coming back online.

### Library safety and MCDF layers

Library details keep moderation internals out of the normal user view. File-count labels open a layers view where local MCDF internals can be inspected and individual layers can be exported back to disk. Remove actions require holding Ctrl while clicking to prevent accidental deletion.


### Layer inventory table

The Library detail view can open a table-style MCDF layer inventory. The table shows type, name, path, size, hash, and a compact download action for each local layer.

### fix158 client polish

- The Eorzea Exchange no longer shows internal MCDF component snippets in normal browsing cards/details.
- Favorites and follows are local saved lists that can be reviewed in Settings.
- Settings now shows how much local disk space MCDF Manager uses for the app home, library, Exchange cache, and downloads.
