# Release screenshot checklist

Use this checklist before publishing a GitHub Release or updating the README screenshots.

## Prepare the demo data

1. Open MCDF Manager.
2. Go to **Admin → Debug settings**.
3. Enable fake Exchange entries and fake Library entries.
4. Use 200 entries for stress/layout screenshots, or 24–48 entries for cleaner marketing screenshots.
5. Disable fake data again before testing real registry behavior.

Debug entries are client-side only and must not be uploaded or written to the real library store.

## Recommended screenshots

- `library-grid.png` — Library view with multiple cards and framed previews.
- `exchange-grid.png` — Exchange view with search/filter toolbar and several entries.
- `exchange-detail.png` — Right-side Exchange detail drawer with image, facts table, and icon action bar.
- `add-mcdf-preview.png` — Add MCDF preview/framing flow.
- `admin-debug-settings.png` — Debug controls used to generate fake data.

## Composition notes

- Keep the window wide enough that cards breathe and no modal title is clipped.
- Hide raw technical views for marketing screenshots.
- Prefer views with preview images, tags, creator names, and clear actions.
- Avoid screenshots containing private local paths, publisher certificates, admin tokens, or moderation-only data.
