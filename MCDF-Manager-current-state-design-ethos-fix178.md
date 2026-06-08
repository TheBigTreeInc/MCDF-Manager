# MCDF Manager — Current State and Design Ethos

## Product position

MCDF Manager is a desktop application for Final Fantasy XIV character package communities. It is a library, inspector, and sharing client for `.mcdf` packages. It is not a Dalamud plugin, not a game plugin, and not a mod loader. The application runs outside the game and focuses on organizing, inspecting, exporting, and sharing MCDF entries through The Eorzea Exchange.

The product direction is: library and Exchange first, technical archive details second. Users should primarily see characters, previews, tags, sharing state, and download actions. Internal file details are available when needed for inspection, recovery, deduplication, and publishing diagnostics.

## Current client state

The client is a Tauri application built with React, TypeScript, Vite, and Rust commands.

The current client supports:

- local MCDF import;
- direct Analyze flow;
- preview image caching and framing;
- local library entries with title, description, tags, 18+ state, preview, source, and publishing state;
- fixed registry endpoint for the public build: `http://mcdf.thebigtree.life:48443`;
- publishing through the registry server;
- owner-managed Exchange editing and deletion for published listings;
- registry hash checks using BLAKE3 payload hashes;
- local file inventory built from internal MCDF payloads;
- selective upload of missing internal file slices;
- grouped Library actions for share, export/download, publish, and remove;
- Library detail overlay drawer so opening an entry does not push the underlying view;
- tag-based Library folders/pinned tags;
- auto-import watched folders;
- cleaner error detail modals;
- Mythgrove/Fantasy-style top-bar typography when licensed fonts are provided;
- share-code import from the Add MCDF modal.

## Current server state

The registry server accepts MCDF publishing requests, stores package/file metadata locally, writes public index data, and syncs the public index to GitHub.

The current server supports:

- startup version banner and `/v1/health` build metadata;
- container runtime user `10001:10001` for mounted `/data` access;
- runtime config from `/data/config.toml` without baked-in localhost overrides;
- Git and SSH availability inside the container;
- public/private Git worktree recovery when runtime folders exist but are not Git checkouts;
- local Git identity configuration before committing generated index data;
- public index rendering into `public/`;
- public preview paths in package records and summaries;
- public share-code fields and a generated `public/indexes/shares.json` lookup;
- owner-scoped edit/delete endpoints for published package metadata and listing removal.

## Sharing model

Users should not have to copy raw GitHub URLs, know the public index structure, or care about ports and API routes.

The visible share format is:

```text
mcdf.thebigtree.life:<id>
```

The current implementation uses the public package hash as the stable share id. The server exports that as:

```json
{
  "share_id": "<package_hash>",
  "share_code": "mcdf.thebigtree.life:<package_hash>"
}
```

The client resolves these codes through the public index, not by treating them as browser URLs. The Add MCDF modal includes a shared/bulk import card where users can paste one or many share codes and optionally apply one tag to all imported entries.

GitHub remains a backing index and storage mechanism. It is not part of the normal sharing UX.

## Storage and deduplication ethos

An MCDF is treated as a package containing internal files/layers. MCDF Manager computes:

- package BLAKE3 hash over the original MCDF bytes;
- component/file BLAKE3 hashes over extracted internal payload bytes.

This allows the registry to ask only for missing internal files. When users have many variations of the same model, repeated internal files can be recognized by hash and reused instead of uploaded repeatedly.

The long-term storage view should show:

- original MCDF size;
- unpacked payload size;
- unique stored size;
- reused/shared size;
- space saved by shared files.

## Library organization ethos

The Library should feel like a character collection, not a filesystem. Users can still import from any location, but watched folders automatically add new `.mcdf` files. Organization should be flexible:

- tags are the primary grouping mechanism;
- users can pin tags as folders;
- folder views do not move files on disk;
- filters and pinned tags should make it easy to group event sets, creators, characters, or variants.

## Moderation and policy ethos

Moderation is always active but should not be noisy in normal user views. Normal users need to know only whether an entry can be shared and, when blocked, which file/hash caused the block.

Use visible labels such as:

- Can share;
- Local only;
- Disallowed;
- Restricted;
- Potentially illegal.

Admin/moderation management belongs in Admin, not in the normal Library detail pane.

## Recovery ethos

Users may lose a loose model, texture, material, or skeleton file that exists inside an MCDF. The Library detail file count opens a layer inventory modal. For local MCDF entries, individual internal files can be exported back to the machine so they can be reused or recovered.

This is a recovery and inspection feature, not a bypass around sharing restrictions. Publishing remains enforced by registry policy and moderation checks.

## Current operational notes

The production registry path on the CoreOS host is `/opt/mcdf-registry`, mounted into the container as `/data`.

The active Quadlet maps:

```ini
Volume=/opt/mcdf-registry:/data:Z,U
Exec=--config /data/config.toml
```

The server config must set:

```toml
[server]
bind = "0.0.0.0:48443"
public_url = "http://mcdf.thebigtree.life:48443"
max_upload_mb = 4096

[storage]
data_dir = "/data"
storage_mode = "local"
```

The current public index sync has been proven working when `git status` inside `/data/public-index` is clean and the latest commit is pushed to `origin/main`.

## Next sensible work

- Improve public Exchange preview rendering for older entries and re-render existing records.
- Add a dedicated import workflow for Google Drive/direct MCDF plus separate preview URL instead of keeping it visually mixed with local import.
- Add a richer storage summary to the Library top area.
- Add public web landing/entry pages later if desired, while keeping share codes as the primary copy/paste format.
- Add UI feedback when the public index has updated and new Exchange entries are available.


## fix160 ownership management update

Published Exchange entries are now manageable by their owner from the client. The UI exposes edit/delete listing controls only when the selected public package owner matches the local registered publisher identity, or when an admin token is configured. The registry still enforces the rule server-side by checking the publisher id, public key, and certificate headers against stored user permissions. Delete marks the package manifest as `removed` and refreshes the public index instead of deleting internal file artifacts.


## Fix161 owner edit modal note

Exchange owner management should stay in normal user-facing marketplace language. Owners can delete a listing when they need to replace the package or preview image, then publish the corrected local entry again. Editing listing metadata should happen in a focused modal, not inline in the details pane and not through browser prompt dialogs.

The Exchange detail pane should be resilient: selecting an entry must keep the detail view open even after a failed owner edit attempt, and modal interactions must not trigger outside-click closure of the selected entry.

## fix162 owner listing studio update

Exchange owner editing should feel like a creator-facing marketplace listing studio rather than a plain settings form. The edit modal now prioritizes the public-facing sales surface: cover image, title, story/description, tags, visibility, and 18+ state.

Owners may replace the public preview image from the edit modal without changing package contents. Package-content fixes, broken MCDF data, or incorrect bundled files still require deleting the Exchange listing and republishing from the corrected local entry so the package hash and download recipe remain trustworthy.

The modal should remain visually enticing: strong fantasy hero copy, a large cover preview, helpful guidance, and clear save/cancel/delete-and-republish actions. It should not expose technical archive details unless needed for troubleshooting.

## Fix166 update — Exchange cover framing parity

Exchange cover images should be treated like Library preview images. A cover is not just an uploaded file; it has framing metadata so the creator can choose how the picture is positioned in cards, details, and edit views.

Current rule:

- Library previews and Exchange covers both use the same preview framing controls.
- Exchange cards, Exchange detail hero previews, and the Exchange owner edit modal all apply the stored crop/zoom metadata.
- Replacing the cover image resets framing to the default center crop so creators can frame the new image cleanly.
- Cosmetic listing changes, including image framing, do not require republishing the MCDF package.
- Actual package-content fixes still require deleting the Exchange listing and republishing from the corrected local entry.

## Fix167 design note - Exchange cover framing parity

Exchange cover images must use the same framing behavior as normal Library/Add MCDF preview images. The creator should click the cover, use the same drag/zoom framing modal, and save the crop metadata with the listing. Exchange detail previews must be clipped inside the same portrait-style frame so a zoomed crop does not spill out or show an uncontrolled amount of the original picture.

## Fix168 design note - Quiet edit surfaces

Exchange edit and Library/Add MCDF entry review screens should avoid large instructional blocks inside data-entry panels. The cover image is self-evident and should behave like the normal Library preview: click the portrait cover to frame it with the shared drag/zoom modal, and use a separate replace action only when choosing a different file.

The Exchange owner edit modal is for cosmetic listing maintenance only: title, description, tags, and cover image/framing. Visibility and 18+ state are publishing/moderation decisions and should not be editable from this quick listing polish modal.

Right-side forms should read as one cohesive edit surface, not stacked panels inside panels. Avoid vertical scrollbars in normal edit modal sizes by keeping headers compact, minimizing explanatory copy, and reserving scrolling only for constrained windows.


## Fix169 design note - Exchange preview URL resilience

Exchange preview images are part of the marketplace browsing surface and must load reliably. Public index records may contain relative preview paths such as `previews/...`, while the image can be available from the live registry endpoint before the GitHub/raw public index mirror has caught up.

The client should therefore treat Exchange preview paths as public assets with multiple valid mirrors: live registry first, then the rendered public index. Cards, detail panes, edit modals, and framing views should all use the same resolver so preview behavior stays consistent across the Exchange.

## Fix170 Exchange asset loading correction

Exchange browsing should not prefer or probe the live registry server for normal listing data or preview-image retrieval. The registry server is for management and data manipulation actions such as publishing, owner edit, deletion, moderation, registration, and health/admin checks.

Normal Exchange browsing should resolve listing data and preview images through the static public index/mirror path. Relative preview paths from package records are joined against the public index base. The client must not silently try the live registry host first for card or detail images, because that couples browsing to the management service and hides public-index sync/rendering issues.

## Fix171 Exchange detail pane refinements

- Exchange detail cover images must apply the same saved preview framing as the Exchange edit modal and Library/Add MCDF preview framing. When a package detail record does not yet include crop metadata, the client should preserve the crop from the index summary instead of falling back to a plain centered crop.
- The Exchange detail pane should not show low-value technical cards such as hash verification state or creator entry counts in the normal browsing view. Technical identity and cache/debug actions remain available but should stay secondary.
- The normal browsing details should use a compact facts table for creator, file count, payload size, description, and tags.
- Detail actions should be grouped into an icon action bar with tooltips instead of a long vertical/wrapped row of text buttons.


## fix172 icon integration

The client now ships a custom fantasy/glamour SVG icon set under `public/icons` and renders app chrome/actions through the shared `SvgIcon` sprite helper. The icon set replaces legacy text glyphs in the sidebar, top bar, window controls, notification bell, preview placeholders, framing controls, Library actions, Exchange table/card actions, Exchange details, and component/file badges.

Icon assets are treated as theme-aware UI primitives: they use `currentColor`, inherit button/status colors, and should remain monochrome/duotone so the fantasy theme can style them consistently.

## Fix174 — Admin debug fake-data mode and quieter top bar

The Admin area now includes a local-only Debug settings panel. These settings are intended for UI stress testing and should never call the live registry or mutate real Library data.

Debug settings support:

- enabling/disabling fake Exchange entries;
- choosing the fake Exchange entry count, defaulting to 200;
- enabling/disabling fake Library entries;
- choosing the fake Library entry count, defaulting to 200;
- immediate update through local storage and a client-side event.

Fake entries are generated only inside the client process. They are not written to the registry, not uploaded, and not persisted into the real Library entry store. They use generated titles, creators, tags, hashes, component counts, byte sizes, and data-URI preview images so the card, table, filtering, and detail-pane layouts can be tested without depending on real content.

The three star ornaments in the top bar were removed. The title area now takes the available drag space until a better fantasy ornament/divider is selected.

## Fix175 UI direction update

The Library and Exchange browse pages should not repeat the global page title inside the content workspace. Search and filter controls should sit in a single integrated, flatter toolbar with practical inputs rather than disconnected rounded pills. Count/date/status strips are secondary and should not consume the first visual row while browsing.

Exchange entry details should behave as a right-side overlay drawer: selecting an entry opens details on the right, the drawer scrolls independently, and closing it immediately restores the full browse grid without leaving reserved empty space.



## Fix176 detail drawer scroll rule

The Exchange detail drawer must expose exactly one scroll surface: the drawer body itself. Nested panel scrollbars are avoided, and horizontal scrolling is not allowed in the detail pane. Long titles, hashes, tags, descriptions, and action bars should wrap, clip, or ellipsize within the drawer instead of widening it.


## fix177 — Layer modal and release screenshot guidance

- The MCDF layer inventory should behave like a contained modal/workspace, not like a window-width table that hides its title or close control. The modal header keeps the entry title readable, shows a quiet `MCDF layers` label, and keeps close visible at the top right.
- Wide technical tables may scroll internally, but the surrounding app should not be forced wider and should not lose controls.
- GitHub-facing product presentation should lead with download links and screenshots of Library, Exchange, detail drawer, Add MCDF preview framing, and Admin debug fake-data controls.
- Admin fake data exists specifically to make release screenshots and layout stress tests easier without using real published content.

## fix178 — Library sync/export/download behavior

- Library entries now separate three actions clearly:
  - **Download MCDF directly** saves a copy from whatever source is available without changing the Library record.
  - **Sync source** downloads an internet-backed source into the local Library cache so the entry can be inspected, layer-exported, and exported later.
  - **Export** copies the synced/local Library MCDF to a user-chosen destination.
- Remote entries keep their original source URL after syncing so users can refresh from the internet source again later.
- Exchange-only entries still use the static public package manifest when no original source URL is stored, but this is treated as a fallback rebuild path rather than the same thing as direct original-source download.
- Rebuilt package hash mismatches are now explained as byte-identical rebuild failures. The preferred recovery path is to use the original internet source when present or republish with full-package archive metadata.
