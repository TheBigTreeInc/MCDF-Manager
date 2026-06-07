# MCDF Manager

**Collect, preview, organize, and share your Final Fantasy XIV MCDF character packages.**

MCDF Manager is a desktop app for people who collect, create, trade, and publish `.mcdf` character packages. It gives you a beautiful local character library and connects you to **The Eorzea Exchange**, where creators can share listings with preview images, tags, descriptions, and download links.

This is not a mod loader and not a Dalamud plugin. It runs outside the game and focuses on one thing: making MCDF collections easier, prettier, and more shareable.

---

## Why install it?

If your MCDF folder is full of character files, old variants, event looks, creator packs, half-remembered downloads, and mysterious filenames, MCDF Manager turns that mess into a browsable character collection.

With MCDF Manager you can:

* import local `.mcdf` files into a visual library;
* give each entry a title, description, tags, and preview image;
* browse public Exchange listings;
* download shared entries from the community;
* publish your own listings with a registered creator profile;
* edit your published Exchange listing later;
* replace a listing preview image without republishing the whole package;
* delete your own Exchange listing when you want to redo it;
* recover internal files from local MCDF packages when needed.

Your local library stays yours. Publishing is an action you choose.

---

## The Eorzea Exchange

The Eorzea Exchange is the public sharing space built into MCDF Manager.

Instead of throwing raw links around, Exchange entries are presented like character listings: preview first, title, tags, description, creator details, and download action. The goal is to make shared MCDFs feel discoverable, collectible, and worth browsing.

Public entries can be downloaded without registration. Publishing and owner tools require a registered profile.

Creators can manage their own listings:

* update title and description;
* update tags and visibility;
* mark 18+ content clearly;
* replace the preview image;
* remove the listing from the Exchange;
* republish from a corrected local entry when the package itself needs to change.

---

## Local library

The Library is where MCDF Manager starts to shine.

Import your packages, add previews, group them with tags, and keep your collection readable even when the original filenames are not. Entries can be organized around characters, creators, events, themes, variants, or anything else that makes sense to you.

The app keeps local metadata separate from the original `.mcdf` file. Changing a title, note, tag, or preview does not modify the package itself.

Local entries can be:

* kept private;
* exported back out as MCDF files;
* published to the Exchange;
* inspected when you need to see what is inside.

---

## Preview-first browsing

MCDF Manager is designed around character presentation, not archive noise.

The interface favors:

* large preview images;
* readable titles;
* useful tags;
* clear download actions;
* fantasy-themed dark styling;
* creator-friendly listing tools.

Technical package details still exist, but they stay where they belong: in inspection, diagnostics, recovery, and publishing checks.

---

## Add MCDFs from multiple places

You can add packages from:

* local files;
* watched folders;
* direct HTTPS links;
* Google Drive links;
* Exchange share codes.

Watched folders are useful when you regularly download or export MCDFs into the same place. MCDF Manager can scan those folders and add new packages to your library while the app is open.

---

## Share codes

Exchange entries can be shared with simple codes like:

```text
mcdf.thebigtree.life:<id>
```

Paste a share code into MCDF Manager and it resolves through the public Exchange index. Users do not need to understand GitHub indexes, registry paths, or backend URLs.

---

## Creator profiles

You can browse and download public listings without registering.

A creator profile is needed when you want to publish or manage your own Exchange listings. Registered creators can update listing metadata, replace previews, and remove their own entries.

Admin and moderation tools exist for community maintenance, ownership corrections, and policy enforcement, but normal users do not need to deal with those systems.

---

## Safety and moderation

MCDF Manager includes hash-based moderation checks for published content.

The app can identify packages and internal files by BLAKE3 hashes. This allows the registry to block known restricted, disallowed, or potentially illegal content without relying on filenames or guesswork.

Local files remain on your machine. Moderation is enforced when sharing through MCDF Manager.

---

## Recovery and inspection

Sometimes you do not need the whole MCDF. You need the texture, model, material, skeleton, or other internal file that was packed inside it.

MCDF Manager can inspect local MCDF entries and export individual internal files back to your machine. This is useful for recovery, repair, and creator workflows.

---

## Installation

Download the latest release for your platform from the GitHub Releases page.

Official builds are intended for:

* Windows
* macOS
* Linux

After installing, open MCDF Manager, add a few `.mcdf` files, choose previews, and start building your library.

---

## Development

MCDF Manager is built with:

* Tauri
* React
* TypeScript
* Vite
* Rust

To run from source:

```powershell
corepack enable
corepack pnpm install
corepack pnpm tauri dev
```

The public client build connects to:

```text
http://mcdf.thebigtree.life:48443
```

---

## What MCDF Manager is not

MCDF Manager is not:

* a Dalamud plugin;
* a game plugin;
* a mod loader;
* a replacement for your existing FFXIV tools;
* a tool that changes files inside the game.

It is a desktop library and sharing client for MCDF packages.

---

## Project direction

MCDF Manager is being built as a fantasy-styled character collection and Exchange client.

The guiding idea is simple:

```text
Characters first.
Archive details second.
```

The more the app grows, the more it should feel like browsing a curated character wardrobe instead of digging through a folder of files.
