## fix185 - library/exchange table polish and browser-state reset

- Prevent Library list-view action icons from overflowing the row.
- Add clearer spacing between Creator and Files in the Exchange list header/table.
- Add an Admin debug reset action for the WebView browser state, since deleting `.mcdf-manager` does not clear localStorage.

## fix186 — GitHub landing README and stable latest links

- Reworked the GitHub README into a product landing page with screenshot sections, clearer download links, and user-facing feature copy.
- Added sanitized screenshots under `docs/screenshots/` for Library, Exchange, Analyze, and publisher registration.
- Release packaging now also publishes stable `*-latest.zip` aliases for direct per-platform README download links.

## fix181 - Add MCDF import layout

- Reworked the Add MCDF modal so local file import is the clear left-side primary action.
- Grouped Google Drive/direct URL and share-code/bulk import into one right-side internet import panel.
- Kept progress and errors below both choices so the modal reads as one import workflow instead of three competing cards.

## fix179 - Exchange component rebuild acceptance

- Changed static Exchange component downloads so a rebuilt MCDF is accepted when all internal component blobs verify, even if the outer MCDF container hash differs from the original uploaded package hash.
- Exact original package hash verification is still enforced for full archived-package downloads.
- Download results now report both the canonical original package hash and the rebuilt container hash/note when they differ.
- Updated the error helper text so older rebuilt-package mismatch logs explain the component-vs-container distinction.


## fix178 - Library source sync and direct downloads

- Added Library actions to download an MCDF directly from whatever source the entry has: local file, original Google Drive/direct URL, or static Exchange package manifest.
- Added a separate Sync source action that downloads internet-backed entries into the local Library cache so they can be inspected and exported later.
- Export now means export the synced/local Library file only; it no longer silently means download.
- Remote source entries keep their source URL after syncing so they can be refreshed again later.
- Improved the rebuilt-package hash mismatch error to explain that component rebuild metadata is not byte-identical and that a direct source download or full-package archive metadata is needed.


## fix177 - Layer modal and release-page polish

- Reworked the MCDF layers modal header so the title is not clipped and the close action remains visible.
- Constrained the layer inventory to the content area with the table scrolling inside the modal instead of stretching the whole window.
- Added a clearer Download section to the README for GitHub Releases.
- Added a release screenshot checklist for using Admin debug fake data to make public screenshots without real packages.

## fix176 - Exchange detail drawer scroll containment

- Fixed the Exchange detail drawer so it has one internal vertical scrollbar instead of nested scrollbars.
- Prevented horizontal overflow in the detail drawer, including long titles, hashes, tags, and action bars.
- Kept the surrounding Exchange grid from becoming a second scroll target while details are open.

## fix174 - Admin debug fake data and top-bar cleanup


## fix175 - Exchange/library browser chrome and detail overlay

- Removed the duplicate Exchange page title/eyebrow and the entries shown/indexed/date strip from the Exchange browse view.
- Removed the duplicate Library results heading/status strip so the global page title carries the page identity.
- Converted Exchange details into a fixed right-side overlay so closing details restores the full browse grid immediately.
- Made the Exchange detail pane independently scrollable for long entries and large result sets.
- Tightened Library and Exchange filter/search controls into a flatter integrated toolbar with less-rounded controls.

- Added Admin → Debug settings for local-only fake Exchange and Library data.
- Added toggles and counts for generating 200 fake Exchange entries and 200 fake Library entries on demand.
- Fake entries are generated client-side only and are not written to the registry or real Library store.
- Removed the three top-bar star ornaments so the chrome is quieter until a better ornament is chosen.

## fix172 - Custom icon set integration

- Added the fantasy/glamour SVG icon set to `public/icons`.
- Added a shared `SvgIcon` component that renders from the bundled sprite using current-color styling.
- Replaced the main sidebar, top bar, window controls, notification bell, preview placeholders, framing controls, Library action buttons, Exchange cards/table actions, and Exchange detail action bar glyphs with the new SVG icons.
- Replaced first-letter component badges with file/component type icons where component kinds are shown.


## fix173 - Exchange image path and follow cleanup

- Restored static public-index preview image resolution to keep the `public/` asset base, so Exchange card/detail images load from the mirror without touching the live registry server.
- Reverted the top-bar Add and notification controls to the previous lightweight glyph styling.
- Removed creator-follow actions from the Exchange browsing/detail UI; Exchange now keeps favorite and track-entry actions only.

## fix171 - Exchange detail pane cleanup

- Applied saved Exchange preview crop metadata to fetched package details even when the package record lags behind the index summary.
- Reworked the Exchange details pane preview so the framed cover uses the same clipping and positioning as the edit/listing preview.
- Replaced the old metric cards and creator-entry count with a compact details table.
- Replaced the long row of action buttons with a compact icon action bar with tooltips.

## fix170 - Static Exchange asset loading

- Reverted the live registry preview-image fallback from Exchange browsing.
- Exchange cards and detail previews now resolve relative preview assets only from the configured static public index location.
- Documented that the live registry host is for publishing, owner edits, deletion, moderation, and other management actions, not normal Exchange image/data retrieval.

## fix169 - Exchange preview endpoint fallback

- Fixed Exchange preview rendering when the public index contains a relative preview path but the image is available from the live registry endpoint before GitHub/raw index propagation catches up.
- Exchange cards, detail previews, and owner edit covers now try the live registry preview URL first and fall back to the public index asset URL.
- Normalized public asset paths so older `public/previews/...` entries do not become duplicated as `public/public/previews/...`.

## fix168 - Quiet Exchange edit studio

- Removed the oversized Exchange edit hero copy and first-impression help text from the owner edit modal.
- Changed the right-side edit fields into one unified form surface instead of separate nested panels.
- Removed visibility and 18+ editing from the owner listing edit view; save now preserves the existing server values for those fields.
- Simplified Exchange cover actions so replacing the cover and framing the current cover are clearly separate. The cover itself opens the shared Library/Add MCDF framing modal.
- Removed equivalent noisy Add MCDF review copy and duplicate choose-picture action so Library entry creation keeps the same quieter preview pattern.
- Tightened modal sizing to avoid unnecessary scrollbars in normal entry/edit layouts.


## fix167 - Exchange cover framing parity

- Changed the Exchange owner edit cover from a plain image box to the same click-to-frame picture surface used by Add MCDF and Library previews.
- Replacing an Exchange cover now opens the framing modal immediately so the creator can crop/position the image before saving.
- Clipped the Exchange detail hero image inside a framed preview container so zoomed cover crops do not spill or show too much image.

# Changelog

## fix182 - stable publisher id for owner edit

- Owner edit/delete now sends the stable publisher id from the server-issued publisher certificate instead of the editable local profile username/display name.
- Imported `.mcdfauth` packages now persist the publisher id explicitly so later profile renames do not orphan Exchange entries.
- Exported auth packages keep the stable publisher id when available.

## fix166-exchange-cover-framing

### Added
- Exchange listings now carry preview framing metadata so Exchange covers can be positioned and zoomed like Library covers.
- The Exchange owner edit modal has a Frame cover action that opens the same drag/zoom framing modal used by the Library preview.

### Changed
- Exchange cards, the owner edit cover preview, and the Exchange detail hero apply the stored preview crop instead of always forcing a center crop.
- Publishing from a local Library entry now sends that entry's preview framing metadata to the registry server.

## fix165-rust-upload-parameter-build

### Fixed
- Removed the duplicated `preview_image_path` Rust command parameter in `upload_mcdf_to_central_server`.
- This fixes the GitHub Actions Rust compile failure `E0415: identifier preview_image_path is bound more than once`.
- Cleaned up the adjacent unnecessary mutable binding warning in the same Rust command module.

## fix164-tauri-asset-protocol-build

### Fixed
- Added the required `protocol-asset` Tauri feature so Cargo builds match the asset protocol enabled in `src-tauri/tauri.conf.json`.
- This fixes the GitHub Actions Rust/Tauri build failure that reported: `Please run tauri dev or tauri build or add the protocol-asset feature`.

## fix163-build-library-folder-tags

### Fixed
- Fixed the TypeScript build error in local Library settings by narrowing persisted folder tags back to `string[]` before returning settings.
- This keeps `pnpm run build` from failing at `src/App.tsx` when strict TypeScript checks infer stored tag data as `unknown[]`.

## fix162-owner-edit-cover-studio

### Added
- Exchange owner edit now uses a richer listing-studio modal with a cover preview panel, stronger marketplace copy, and a replace-cover-image action.
- Owner edit can send a replacement preview image to the registry server while keeping package contents unchanged.

### Changed
- The modal now explains the difference between cosmetic listing edits and package-content fixes, with a delete-and-republish action available from the same flow.
- Exchange selection no longer clears the active detail record before loading the selected package, reducing open/close flicker after failed edits.

## fix161-owner-edit-modal-stability

### Changed
- Exchange owner editing now opens a modal with title, description, tags, visibility, and 18+ controls instead of browser prompt dialogs.
- The edit modal explains that preview-image or package-content fixes should be done by deleting the Exchange listing and republishing from the corrected local entry.

### Fixed
- Selecting an Exchange entry now explicitly reopens and keeps the detail drawer open after loading the selected package record.
- Exchange detail outside-click handling now ignores active package loads and edit modals so an edit error cannot leave the selected entry immediately closing.

## fix160-owner-edit-delete-exchange

### Added
- Exchange detail view now shows owner/admin listing controls when the current publisher identity owns the selected package or an admin token is present.
- Owners can edit published title, description, tags, 18+ flag, and visibility from MCDF Manager.
- Owners can delete their own Exchange listing from the public index without using admin moderation tooling.

### Changed
- Owner edit/delete actions send the local publisher certificate headers to the registry server so the server can enforce ownership instead of trusting the UI.

## fix159-layer-table-resizable-columns

### Changed
- MCDF layer inventory table now places the download action first so exports are visible without widening the app window.
- Layer table columns can be resized from the header.
- Layer table rows stay inside the modal with internal scrolling instead of pushing the application wider.


## fix158 — Exchange cleanup, saved lists, and local storage usage

- Removed visible MCDF component/part snippets from The Eorzea Exchange cards and details.
- Kept Exchange entries focused on title, creator, preview, tags, size, and action state.
- Clarified favorites and creator follows as local saved lists.
- Added a Settings section to review and clear favorite entries, followed creators, and tracked Exchange entries.
- Added local disk usage in Settings for app home, library, Exchange cache, and downloads folders.

## fix157 — Layer inventory table polish

- Changed the MCDF layer viewer into a cleaner table-style inventory.
- Added plain text layer type and name columns.
- Shortened long layer paths with tooltips to prevent overflow.
- Replaced the text download button with a compact download icon action.


## fix156-library-layers-ctrl-remove

- Fixed the Library file-count action so it opens a stable MCDF layers modal instead of breaking the app view.
- Added per-layer download/export from local MCDF library entries.
- Hid the normal-user moderation-active indicator from the Library toolbar.
- Made remove actions require holding Ctrl while clicking so destructive removal is intentional.


## fix155 — Offline service indicator

### Added
- Added a top-bar service status badge when the registry or public Exchange index is offline.
- MCDF Manager now keeps local Library and Analyze workflows available while remote services are unavailable.
- Added periodic registry and public index checks with browser online/offline event handling.

### Changed
- Remote service failures are visible without blocking local MCDF work.


## fix154 — Share codes, layer downloads, and library import polish

### Added
- Share actions now copy an MCDF Manager share code in the form `mcdf.thebigtree.life:<id>` instead of raw GitHub implementation paths.
- Add MCDF now includes a shared/bulk import card for one or more share codes with an optional tag applied to all imported entries.
- Library file counts now open a layer inventory modal.
- Local MCDF layer inventory supports downloading individual internal files back to the machine.

### Changed
- Library details stay as an overlay drawer and avoid normal moderation-management controls in the user-facing detail pane.
- Completed transfer/event rows clear more quickly after finishing.
- Publish date copy now reads `Publish on: <date>`.

## fix153 — Library overlay, tag folders, transfer cleanup, Exchange previews

- Library entry details now open as an overlay drawer, so selecting an MCDF no longer resizes or shifts the underlying library list.
- Finished transfer rows now clear automatically after a short delay; failed rows stay longer for troubleshooting and then clean up too.
- Added Library tag folders: filter by any tag, pin a tag as a folder, and unpin folders without moving files on disk.
- Exchange preview paths from the public index are now used when available so published registry images can render in cards and detail views.

## fix152 — Fixed registry endpoint

- MCDF Manager now uses the fixed public registry endpoint `http://mcdf.thebigtree.life:48443`.
- The registry endpoint is no longer configurable in the client UI or through legacy local settings.
- Legacy localhost, bare-port, and imported `.mcdfauth` archive-host values are ignored so publishing cannot silently fall back to `127.0.0.1`.
- The Tauri URL resolver now rejects localhost registry URLs in this public client build.

## fix151 — Publish URL hardening

- File uploads now always use the configured registry origin instead of trusting server-returned absolute upload URLs.
- Job polling URLs are normalized through the configured registry origin, so old server responses cannot send the client to `127.0.0.1`.
- Publishing diagnostics now align with the registry URL shown in Settings.


## fix150 — Publish upload URL normalization

- Publish now rewrites registry-returned localhost upload links to the configured registry server origin.
- Missing-file uploads no longer fail when the server returns an internal `127.0.0.1` upload URL.
- Error diagnostics remain attached to the publish step when an upload endpoint cannot be reached.

## fix149-publish-error-diagnostics

### Fixed
- Publish errors now include actual context for troubleshooting, including server URL, preview path, token state, publisher key/certificate state, and the entry being published.
- Multiline publisher certificates are no longer sent as raw HTTP header values, which caused local request-builder failures before the publish request reached the registry.
- Compatibility publish metadata now uses a header-safe hex fallback when the metadata contains unsupported characters or is too large for a normal header.
- Error details now explain header-builder failures as a publish request construction problem instead of blaming the preview image alone.

## fix148-error-log-string-compile-fix

### Fixed
- Fixed the Vite/React compile error caused by multiline error-log text being emitted as unterminated string literals.
- Actionable error details now use escaped newline text so MCDF Manager can start normally while still showing a readable structured error log.

## fix147-actionable-error-details

### Fixed
- Preview/publish errors no longer show only the vague `builder error` message.
- Error details now include a structured log with a summary, what happened, likely cause, things to try, and the raw technical error.
- Registry publish request failures now include the failed step, such as file probe, missing-file upload, package registration, or compatibility MCDF upload.

## fix146-token-save-admin-pane-error-details

### Fixed
- Server token entry now stays editable until the token is actually saved.
- Saving a token now refreshes the Admin pane immediately after success.
- Token save errors now remain visible instead of pretending the token was configured.
- Error details modal alignment is cleaner and easier to read.

## fix145-navigation-and-preview-publish-error

### Changed
- Renamed the navigation label **Analyze MCDF** to **Analyze**.
- Changed the library navigation label from **LIBRARY** to **Library**.

### Fixed
- Compatibility publishing no longer fails with an unhelpful `builder error` when a preview image makes the metadata header too large.
- The compatibility upload path now reports clearer request-build/send errors.


## fix144 — Mythgrove top-bar title font

### Changed
- Top-bar page titles now prefer the Mythgrove serif typeface, with Fantasy Magist and other serif fallbacks when the font is not available.
- Added optional app font asset paths for licensed builds: `public/fonts/MythgroveRegular.otf` and `public/fonts/MythgroveSlanted.otf`.

## fix143 — Fantasy Magist top-bar titles

### Changed
- Top-bar page titles now use `Fantasy Magist` when that serif typeface is installed or bundled by the build environment.
- Added serif fallbacks so the title remains readable when the font is not available.

## fix142 — Auth migration and registration routing

### Added
- Added `scripts/Build-MCDFAuthFromLegacyConfig.ps1` to build a `.mcdfauth` migration package from a legacy config or explicit publisher key values.

### Changed
- Clicking the unregistered identity area now opens the Register new account flow instead of the profile editor.
- Profile copy now describes the registry server as the owner of the public publisher profile, with the client keeping only a local identity cache for signing and migration export.

### Fixed
- Unregistered users are no longer sent to the profile editor when they need to register or import an existing identity.


## fix141 — Faster inverted preview drag

- Preview framing drag movement is now faster and inverted so the picture moves naturally inside the frame.
- The preview frame now uses a four-way move cursor and center move indicator while positioning the image.

## fix140 — Block browser function keys

- Blocked browser/WebView function-key shortcuts inside MCDF Manager so F1-F12 no longer trigger app-unrelated actions such as browser help, refresh, caret browsing, fullscreen, or developer shortcuts.
- Alt and OS-level combinations remain untouched so normal window/system shortcuts still work.

## fix139 — Drag preview framing

- Added direct drag positioning inside the Frame picture preview area.
- Users can now drag the image to reposition it, use the mouse wheel to zoom, or use the in-frame arrow controls for small adjustments.
- The image itself no longer starts browser drag behavior while framing.

## fix138 — Integrated wheel preview framing

- Replaced the separate preview framing sliders with controls integrated into the image frame.
- The framing modal now uses mouse wheel scrolling to zoom and four in-frame arrow buttons to move the image.
- Removed the explanatory text under the Frame picture title so the modal focuses on the preview and Apply action.

## fix137 — Integrated preview framing modal

- Preview framing now opens as an interactive modal instead of sitting as a separate side panel beside the Add MCDF form.
- The Add MCDF image box stays at a fixed size and opens the framing tool when a picture is selected.
- Added an explicit Apply picture frame action so crop changes are confirmed before returning to the Add MCDF review form.
- Library entry preview framing uses the same modal flow for a more consistent image-editing experience.

## fix136 — Preview framing controls

- Add MCDF preview images now stay inside a fixed portrait frame so the modal layout does not change when a picture is selected.
- Added preview framing controls for zoom, horizontal position, and vertical position so users can choose the best crop for an MCDF entry.
- Library preview tiles and the entry detail preview now reuse the saved framing data.

## fix135 — Preview image display path

- Enabled the Tauri local asset protocol for MCDF Manager preview cache paths so selected Add MCDF pictures can render immediately in the review modal and later in the library.
- Added a fallback for the Add MCDF preview tile so a broken image shows the normal placeholder instead of a browser broken-image icon.

## fix134 — Add MCDF preview persistence

- Fixed Add MCDF preview images so selected pictures are cached before the library entry is written.
- Disabled the Add to Library action while the selected preview image is still being saved.
- Added a small review note showing that the chosen preview image is stored with the library entry.

## 0.1.0 — fix133-add-mcdf-review-polish

### Changed
- Add MCDF now says details stay local until published.
- The 18+ control in Add MCDF now uses the same compact review styling as the rest of the modal.
- Detected MCDF information in the Add MCDF review step is shown as a compact table instead of loose pills.

## 0.1.0 — fix132-preview-image-library-cache

### Fixed
- Preview images selected while importing an MCDF are now copied into the MCDF Manager library preview cache before the entry is saved.
- Changing a library preview now stores the cached preview path, so the picture stays attached after switching pages, restarting the app, or moving the original image.

### Changed
- Profile and publish preview pickers use the same cached-image path as library imports.

## 0.1.0 — fix131-settings-form-unification

### Changed
- Settings now use one visual form standard across storage, token, visibility, and legal sections.
- Settings text boxes and selects now use less-rounded corners for a cleaner square form style.
- Checkbox rows and helper text now match the compact top storage section styling.

## fix130-config-file-open-existing

### Fixed
- The Settings config-file picker now opens an existing JSON config file instead of using a save dialog that asks to overwrite the selected file.
- Updated config-file helper text so it is clear that saving Settings writes to the selected config file.

## fix129-auto-import-watched-folder-copy

- Renamed the auto-import setting to "Auto-import watched folders" so it is clear that the folders are watched intake locations, not the only place files can be imported from.
- Updated the Settings helper text to explain that Add MCDF and Analyze MCDF can import from anywhere, while watched folders automatically add new `.mcdf` files while MCDF Manager is open.
- Renamed the manual scan action to "Scan watched folders" and the picker action to "Add watched folder".

## fix128-image-error-details-layout

### Changed
- Image picker and preview upload errors now show a short readable message with an underlined details link that opens a modal with the full raw error.
- Preview image read failures now use MCDF Manager wording instead of generic builder/internal error text.
- Library list/detail sizing now clamps to the available window width so the detail panel and action columns do not push the view wider than the app window.

### Fixed
- Fixed the compatibility upload request header wiring for publisher identity metadata.

## fix126-config-auto-import-owner-polish

### Added
- Settings can now point MCDF Manager at a configurable JSON config file instead of only using the default profile path.
- Added auto-import folders for newly added `.mcdf` files, with an optional recursive scan mode and a manual scan action in the Library.
- Added an Admin ownership tool to move a published Exchange entry to a different owner account.

### Changed
- Renamed remaining legacy marketplace crate, binary, app-home, identifier, and metadata-header references to MCDF Manager naming.
- Analyze MCDF progress now shows concise status updates instead of explanatory text inside the loading bar.
- The local app config directory now defaults to `.mcdf-manager` and supports `MCDF_MANAGER_HOME` and `MCDF_MANAGER_CONFIG`.

### Notes
- The server warning `private admin state sync failed ... No such file or directory` indicates the registry container cannot start the private git clone command, usually because `git` or `ssh` is missing from the server image, or the configured runtime path/SSH key is unavailable. The client now exposes the required admin actions, but the server image still needs git/ssh/runtime-path validation in the admin/server source.



## 0.1.0-main release manifest argument fix

### Fixed
- Main branch prerelease packaging now writes `release-manifest.json` correctly when the manifest script is called through `pnpm run`.
- The release manifest script now ignores pnpm's `--` separator and reports a clear error when the packaged asset directory is missing.

## fix124-main-branch-release-assets

### Changed
- Main branch pushes now create a prerelease GitHub Release with official MCDF Manager desktop assets.
- Main branch release tags use the GitHub run number, such as `client-main-124`, while asset versions use the package version plus the run number, such as `0.1.0-main.124`.
- Main branch prereleases no longer require a matching changelog version entry, while official `client-v*` releases still require the tag version to match `package.json` and `CHANGELOG.md`.
- The temporary build artifact workflow is now manual-only to avoid duplicate full platform builds on every main branch push.

### Fixed
- Main branch builds now attach generated release files, including platform zips, `checksums.txt`, and `release-manifest.json`, instead of leaving generated files only inside workflow artifacts.

## 0.1.0 — Client release pipeline

### Added
- Added release helper scripts for public text validation, release version validation, release notes generation, and release manifest generation.
- Added a separate client build workflow for temporary main-branch/manual Actions artifacts without creating public GitHub Releases.
- Added Rust `cargo check` to CI and release builds so Tauri command-layer compile errors are caught before release assets are published.

### Changed
- Public client releases are now created from `client-v*` tags or the manual release workflow, not automatically from every main branch push.
- Release workflow metadata now derives the public version from the release tag and requires it to match `package.json`.
- Release notes now use a dedicated generator script and publish as `MCDF Manager <version>` instead of exposing raw tag/build wording.
- README now documents the release pipeline, official artifact names, and the tag-based release process.

### Fixed
- Main branch validation no longer creates noisy prerelease GitHub entries for ordinary source pushes.
- CI now catches Rust backend compile failures like missing Tauri command struct fields.


## fix122-policy-admin-ux

### Changed
- Removed the admin-only Check sharing policy action from the normal Library toolbar so uploading does not look blocked by a manual moderation step.
- Added automatic admin-token preflight before publishing when moderation access is configured; publishing still relies on the registry to enforce blocked hashes.
- Added a selected-entry Refresh moderation status action for admins so the exact blocked package or file hash can be refreshed from the detail panel.
- Clarified that moderation blocks are managed in Admin under the Moderation blocklist, not from normal library entries.

### Fixed
- Fixed a duplicated Library list row wrapper left by the previous action-cluster layout pass.


## fix121-compile-fix-selective-upload

### Fixed
- Fixed the Windows Tauri build error caused by the RAM-slice selective upload parser adding `decoded_bytes` to `ParsedMCDFPackage` while one exact-rebuild synthetic package initializer still omitted it.
- Exchange downloads and exact rebuild metadata now compile with the RAM-backed package model.

## fix120-ram-slice-selective-upload

### Changed
- MCDF parsing now keeps one decoded package buffer and records internal file offsets instead of cloning every internal payload during analysis.
- Upload publishing now probes the registry with the hash manifest first, then sends only the missing internal file slices requested by the server.
- Analyze MCDF, file inventory inspection, and scan commands now use the same package parse result so metadata and internal hashes are produced from one parsed package view.

### Fixed
- Reduced large MCDF memory churn during analysis and publishing by avoiding one Vec copy per internal texture, model, material, or skeleton file.
- Publishing notes now describe skipped known files and uploaded missing slices so the user understands that the client is not re-uploading already-known registry layers.

## fix119-analyze-import-registry-status

### Added
- Analyze MCDF now keeps the action bar visible before and after selecting a file.
- Added Import to library directly from Analyze MCDF so a locally inspected bundle can be added to MCDF Manager without opening the Add MCDF flow.
- Internal file inventory rows now show whether each file hash is not checked, known in the registry, missing in the registry, or unknown.
- Added a combined native analyze command that opens the MCDF once and returns metadata plus internal file hashes together.

### Changed
- Analyze MCDF no longer shows the large empty upload panel before a file is selected.
- Component groups show registry status only after the registry hash check runs. Before that they show registry not checked instead of 0 known / 0 missing.
- Metadata display now hides missing sections and only shows found metadata badges, with a cleaner empty-description message.
- Large-file progress text explains that opening and hashing can be slow because the app reads archive metadata and internal entries safely.

### Fixed
- Removed the misleading Availability known progress card after a registry hash check completes.
- Removed misleading zero known / zero missing counts before the registry check runs.

## fix118-direct-analyze-and-release-polish

### Added
- Analyze MCDF now opens the file picker directly from the navigation item.
- The Analyze MCDF page shows results first, with only a compact action bar after a file is selected.
- GitHub Releases now publish clean MCDF Manager platform assets, checksums, and a release manifest.
- Client CI now validates the public client build and checks public product text for private/internal wording.
- Added a GitHub bug report template so found bugs have consistent reproduction, version, platform, and log fields.

### Changed
- Removed the large pre-analysis panels from Analyze MCDF.
- Release notes are generated from the top CHANGELOG entry and uploaded to the GitHub Release page.
- Release artifacts now use official names such as `MCDF-Manager-Windows-x86_64-v0.1.0.zip` instead of attempt-numbered CI artifacts.

### Fixed
- Analyze MCDF no longer requires an extra button click after opening the page from the sidebar.
- Release assets no longer expose `attempt.1` naming on the public release page.

## fix117-library-disallowed-and-analyzer-layout

- Changed the Library sharing state so blocked entries show a strong Disallowed label instead of showing Allowed as the main status.
- Removed Review needed from normal library sharing classifications; moderation review remains an admin workflow concept, not a library state.
- Reduced repeated local/on-device wording in library cards, pills, and filters.
- Simplified Library list view columns by removing duplicate Source/Status columns and keeping Exchange, Sharing, and Blocking file visible.
- Reflowed Analyze MCDF into a single-width layout with the internal file inventory below the summary panels to avoid horizontal scrolling.
- Made long MCDF paths and hashes wrap/tooltip safely in analyzer and policy panels.

## fix116-library-action-cluster

- Added grouped library entry actions for Share, Export/Download, Publish, and Remove.
- Added a public Exchange share action that copies a share reference for entries already listed publicly.
- Added Export MCDF for local library entries so users can save the MCDF back out of the library.
- Reused the Download MCDF flow for subscribed Exchange entries from the same action cluster.
- Kept blocked entries visible but disabled publishing when the sharing policy blocks upload.

## fix115-library-sharing-policy-classification

- Added stored file-hash manifests for local MCDF library entries.
- Added sharing policy classification fields for allowed, restricted, blocked by policy, review needed, and potentially illegal moderation matches.
- Added a Library list-view Sharing column and Reason file column so blocked uploads show the exact package or file hash reason.
- Added a Check sharing policy action that matches stored package/file BLAKE3 hashes against the moderation blocklist without uploading MCDF bytes.
- Publishing is blocked locally when a library entry has a blocked moderation classification.
- Added a potentially illegal category to the admin moderation block form.

## fix114-local-analyze-hash-manifest

- Analyze MCDF now parses local metadata and internal files without contacting the registry server.
- Added a separate Check online hashes action that sends only the collected BLAKE3 hash manifest to the archive server.
- Server availability check failures keep the local analysis visible instead of failing the Analyze MCDF flow.
- Added a Tauri command for the hash manifest probe so the desktop client uses the same native network path as archive operations.

## fix113-project-page-changelog

- Added a public project README for the MCDF Manager client repository.
- Added this changelog for release history.
- Updated the release workflow to build tagged client releases.
- Kept local library behavior explicit: local metadata changes stay local until publishing.
- Documented the difference between local availability and Exchange visibility.

## fix112-local-preview-status

- Local preview image changes persist and render correctly.
- Local entries show `local` status.
- Exchange visibility is shown separately as public listing state.