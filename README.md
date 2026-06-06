# MCDF Manager

**Because your character packages deserve better than a folder full of mystery files.**

![Status](https://img.shields.io/badge/status-active-7c3aed)
![Client](https://img.shields.io/badge/client-Windows%20%7C%20macOS%20%7C%20Linux-2563eb)
![FFXIV](https://img.shields.io/badge/for-Final%20Fantasy%20XIV-b45309)

MCDF Manager helps you organize, inspect, export, and share `.mcdf` character packages without turning your collection into a pile of duplicate archives.

If you have ever tried to share an MCDF with someone, keep several versions of the same look, or remember which file contains which variation, MCDF Manager is built for that problem.

You can keep your character packages together, see what is inside them, publish approved entries to the Eorzea Exchange, and avoid uploading the same shared files over and over again.

MCDF Manager is **not a Dalamud plugin**, **not a game plugin**, and **does not run inside Final Fantasy XIV**. It is a separate desktop application for managing MCDF packages outside the game.

---

## Share MCDF packages more easily

Sharing MCDF files is often messy.

Files are large, previews get separated from the package, people lose track of which version is current, and every small variation can become another full-size archive.

MCDF Manager gives you a clearer sharing flow:

* import an MCDF;
* inspect what is inside;
* add title, description, tags, preview, and 18+ status;
* check whether files are already known by the registry;
* publish approved entries to the Eorzea Exchange;
* share the public Exchange entry with someone else.

Instead of sending around unexplained files, you can share a proper entry that shows what the package is, what it contains, and whether it is available.

---

## Save space when you keep variations

Many MCDF collections contain repeated files.

For example, you might have 15 versions of the same character model with slightly different textures, poses, colors, accessories, or metadata. Stored as normal MCDF files, each variation can carry another copy of the same large model and texture data.

MCDF Manager works toward a content-addressed library model. Files are identified by BLAKE3 hashes, so repeated internal files can be recognized as the same content.

That makes it possible to understand storage like this:

```text
15 MCDF variations
  same base model
  same body textures
  same materials
  different small changes
```

Instead of treating every MCDF as a completely separate blob, MCDF Manager can track:

* original MCDF size;
* unpacked content size;
* shared files;
* unique files;
* how much data is reused;
* how much new storage a variation actually adds.

The result is a library that understands your collection instead of just storing another copy of everything.

---

## Keep your collection together

MCDF Manager gives you one place to manage the packages you care about.

You can:

* keep character packages in a library;
* attach previews;
* edit names, descriptions, tags, and 18+ status;
* see whether an entry is private, local-only, public, or blocked from sharing;
* export/download an MCDF again later;
* publish entries when they are allowed;
* remove entries you no longer need.

The goal is simple: your MCDFs stay understandable, searchable, and reusable.

---

## Know what is inside before you share

Before you publish or pass around a package, MCDF Manager can inspect it.

You can see:

* package metadata;
* internal files;
* file categories such as textures, models, materials, and skeletons;
* file sizes;
* BLAKE3 hashes;
* registry availability;
* sharing status;
* blocked or restricted files.

That means you can tell the difference between “this is safe to share”, “this is only for my library”, and “this file is blocked by moderation or creator restriction.”

---

## The Eorzea Exchange

The Eorzea Exchange is the public listing area for approved shared MCDF entries.

When you publish to the Exchange, MCDF Manager checks the package against registry and moderation data. If a package contains restricted, blocked, or potentially illegal content, publishing is blocked and the reason is shown.

| Status                  | What it means                                                                |
| ----------------------- | ---------------------------------------------------------------------------- |
| **Can share**           | This entry can be shared through MCDF Manager.                               |
| **Local only**          | This entry is in your library, but not listed publicly.                      |
| **Disallowed**          | This entry contains content that cannot be uploaded or shared.               |
| **Restricted**          | A file matches a creator or moderation restriction.                          |
| **Potentially illegal** | A moderator marked a file hash or combination as legally unsafe for sharing. |

When sharing is blocked, MCDF Manager shows the file or hash that caused the block.

---

## Respect creators and avoid unsafe sharing

MCDF Manager uses BLAKE3 hashes to identify files without needing to upload a full package just to check it.

Creators and moderators can provide hashes for files that are not allowed for redistribution. When one of those hashes is found, MCDF Manager keeps the package in your library but blocks upload and public sharing.

This helps prevent accidental redistribution of creator-restricted, policy-blocked, or legally unsafe content.

---

## What MCDF Manager is not

MCDF Manager is not:

* a Final Fantasy XIV plugin;
* a Dalamud plugin;
* a mod loader;
* a game injection tool;
* a tool for bypassing creator permissions;
* a tool for redistributing blocked or restricted files.

It works outside the game and focuses on package inspection, collection management, registry checks, storage awareness, and approved sharing.

---

## Rules for use

Use MCDF Manager to organize, inspect, and share MCDF entries that you are allowed to share.

Do not use MCDF Manager to upload or publish:

* files you do not have permission to redistribute;
* paid, private, or creator-restricted assets;
* packages marked as blocked by moderation;
* files or combinations marked as potentially illegal;
* content that violates the rules of the Exchange or the communities you participate in.

MCDF Manager blocks known restricted hashes and moderation-blocked content from public sharing.

---

## Why use it?

Because your character packages deserve better than a folder full of mystery files.

MCDF Manager helps you share MCDFs in a way that is cleaner, safer, and easier to understand. It keeps your collection together, shows what is inside each package, tracks repeated files, highlights what can be shared, and blocks content that is not allowed on the Exchange.

You stay in control of your character library, your variations, your storage, and what you choose to share.

---

## Unofficial project notice

MCDF Manager is an unofficial community tool. It is not affiliated with, endorsed by, or supported by Square Enix, Creative Studio III, or the Final Fantasy XIV development team.

Final Fantasy XIV and related names are trademarks or registered trademarks of Square Enix Holdings Co., Ltd.
