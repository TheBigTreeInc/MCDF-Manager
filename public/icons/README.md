# Icon Set — Fantasy Glamour Pass

A custom 78-icon set restyled with a subtle fantasy/glamour layer. The semantic base shapes are preserved so every action still reads clearly at 16–24 px, while small sparkles, diamonds, crowns, and faint ornamental arcs add the more polished/fantasy feel.


## Fantasy / glamour pass notes

- Purpose stays primary: each icon keeps its original silhouette and `aria-label`.
- Glamour is intentionally secondary: small decorative marks live mostly in the corners or behind the glyph.
- The set still uses `currentColor`, so it fits existing button, sidebar, and status-color styling.
- New theming hooks: `mcdf-icon--fantasy-glamour`, `icon-glamour`, and `icon-aura`.
- Recommended accent palette for a glamorous theme: deep violet/navy surfaces with warm gold or rose highlights.

```css
.icon { color: var(--text); }
.icon-accent { color: var(--accent); }
.icon-glamour { color: var(--glamour-accent, var(--accent)); }
.icon-aura { color: var(--glamour-aura, var(--accent)); }
```

## Format

- **Vector:** SVG, transparent background
- **Grid:** 24×24 viewBox, 1.75 px stroke, round caps & joins
- **Recommended sizes:** 16, 20, 24, 32 px
- **Theming:** `stroke="currentColor"` — the surrounding `color` drives everything
- **Duotone:** inner accent shapes carry `class="icon-accent"`; color them with CSS

```css
.icon { color: var(--text); }            /* main stroke */
.icon-accent { color: var(--accent); }   /* duotone accent */
```

## Categories

| Folder | Count | Purpose |
| --- | --- | --- |
| `core-navigation/` | 7 | Sidebar nav, top-bar decoration |
| `global-actions/` | 11 | Add, refresh, close, save, cancel, sync, window controls, notifications, transfers |
| `mcdf-actions/` | 10 | Import / add / download / export / publish / share / open / remove / folder |
| `exchange-actions/` | 12 | Favorite, in-library, follow, edit, delete, report, admin-remove, 18+ |
| `status/` | 10 | Connected, disconnected, loading, success, warning, error, restricted, public, local-only, adult |
| `preview/` | 9 | Replace cover, crop, zoom in/out, move, move up/down, reset framing, empty placeholder |
| `file-types/` | 10 | Model, material, texture, skeleton, animation, pose, metadata, unknown, MCDF package, hash chunk |
| `admin/` | 9 | Block / unblock hash, blocklist, moderation queue, user, publisher certificate, registry, public index, access requests |

Open `preview.html` in a browser to browse every icon, toggle light/dark, and click to copy the raw SVG markup.

## Usage

### Inline (recommended for theming)

```html
<button class="icon-btn">
  <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
    <use href="/icons/exchange-actions/favorite-filled.svg#root" />
  </svg>
  Favorite
</button>
```

Or paste the markup directly and add `class="icon"` to the `<svg>` — `currentColor` lets the parent `color:` cascade in.

### As `<img>` or CSS background

```html
<img src="/icons/global-actions/refresh.svg" width="20" height="20" alt="" />
```

```css
.btn-refresh { background: url('/icons/global-actions/refresh.svg') no-repeat center; }
```

For colored buttons, prefer inline so `currentColor` works.

### SVG sprite (one file, all icons)

`sprite.svg` bundles every icon as a `<symbol id="...">`. Include it once and reference with `<use>`:

```html
<body>
  <!-- include once, hidden -->
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <use href="/icons/sprite.svg#favorite-filled" />
  </svg>

  <button class="icon-btn">
    <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
      <use href="/icons/sprite.svg#favorite-filled" />
    </svg>
    Favorite
  </button>
</body>
```

```css
.icon { color: var(--text); stroke-width: 1.75; }
.icon-btn:hover .icon { color: var(--accent); }
```

### Stroke / size override

All paths inherit the parent stroke. If you need a different weight, override the SVG element:

```css
.icon--bold svg { stroke-width: 2.25; }
```

## Mapping to the legacy glyph set

| Legacy glyph | New icon |
| --- | --- |
| `⌁` Library | `core-navigation/library.svg` |
| `✧` Exchange / Registry | `core-navigation/exchange.svg` |
| `◇` Analyze / Inspect | `core-navigation/analyze.svg` / `inspect.svg` |
| `⚙` Settings | `core-navigation/settings.svg` |
| `✦` Admin | `core-navigation/admin.svg` |
| `＋` Add | `global-actions/add.svg` |
| Bell | `global-actions/notifications.svg` |
| Window glyphs | `minimize` / `maximize` / `restore` / `close` |
| `↻` Refresh | `global-actions/refresh.svg` |
| `transfer dot/text` | `global-actions/transfers.svg` |
| `☆` Add favorite | `exchange-actions/favorite-empty.svg` |
| `★` Favorited | `exchange-actions/favorite-filled.svg` |
| `+` Add to Library | `exchange-actions/add-to-library.svg` |
| `✓` Followed / in library | `exchange-actions/in-library.svg` / `following-creator.svg` |
| `—` Empty | `exchange-actions/favorite-empty.svg` |
| `18+` | `exchange-actions/adult-marker.svg` |
| `↓` Download | `mcdf-actions/download.svg` |
| `↗` Show location | `mcdf-actions/open-location.svg` |
| `↧` Export | `mcdf-actions/export.svg` |
| `✦` Publish / share | `mcdf-actions/publish.svg` |
| `×` Remove / close | `global-actions/close.svg` |
| `✧` Empty preview | `preview/empty-placeholder.svg` |
| `↓ Download` (detail) | `mcdf-actions/download.svg` |
| `+ Add to My Library` | `exchange-actions/add-to-library.svg` |
| `☆ Favorite` | `exchange-actions/favorite-empty.svg` |
| `✎ Edit` | `exchange-actions/edit-listing.svg` |
| `⌫ Delete` | `exchange-actions/delete-listing.svg` |
| `! Report` | `exchange-actions/report-listing.svg` |
| `⊘ Admin remove` | `exchange-actions/admin-remove.svg` |
| `◇ Inspect cache` | `core-navigation/inspect.svg` |
| M / T / S / A first-letter badges | `file-types/{model,material,texture,skeleton,animation,pose,…}.svg` |
| Blocklist | `admin/blocklist.svg` |
| Access requests | `admin/access-requests.svg` |
| Save / Cancel | `global-actions/save.svg` / `cancel.svg` |
| Frame / crop / zoom | `preview/{crop,zoom-in,zoom-out}.svg` |
| Move image | `preview/move-up.svg` / `move-down.svg` / `move.svg` |

## Notes for designers / future passes

- Geometry is locked to a 24-grid with 1.5–2 px stroke weight. If you redesign any icon, keep the visual weight the same so they sit together.
- `class="icon-accent"` is reserved for the secondary tone. Keep accent shapes under ~30% of the icon area so the icon reads as monochrome at a glance.
- All icons render at 16 px without subpixel fuzz; some "—" or "·" legacy glyphs (e.g. transfer dot) intentionally use a small filled shape to stay legible at that size.
- If you want a true duotone palette baked in, you can swap `currentColor` for two named CSS variables (`--icon-fg`, `--icon-accent`) and remove the `currentColor` references.
