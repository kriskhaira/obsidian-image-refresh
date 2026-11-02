# Image Refresh

Redraw embedded images in open notes when the image file changes on disk, without closing the note.

Obsidian draws an embedded image once, with a URL stamped with the file's modified time. When another app or script overwrites the image under the same filename (an editor, a screenshot tool, an AI agent adding a highlight), the open note keeps showing the old picture until it is closed and reopened. Obsidian notices the change, but it only redraws a note when the note's own Markdown changes.

This plugin listens for changes to image files in the vault and gives every `<img>` that shows that file a fresh URL, so the new picture appears straight away. It works in Live Preview, Source mode, Reading view, Canvas and pop-out windows.

- 🎯 **Matches by file path**, not by alt text or filename, so a resized embed (`![[photo.jpg|300]]`) or a Markdown link (`![](photo.jpg)`) refreshes too, and `photo.jpg` never touches `photo.jpg.png`.
- 🖱️ **Right-click an embedded image** for Obsidian's own file menu for that image: Reveal in Finder, Copy path (vault or system), Open in default app, Open in new tab, Rename. Obsidian 1.14's own image menu did not appear in Live Preview on the author's vault (the text-editing menu showed instead), so the plugin opens the core link menu itself. A right-click anywhere else is untouched.
- ⚙️ **Setting:** which extensions count as images (default `png, jpg, jpeg, gif, webp, svg, bmp, avif`).
- 🪶 **Nothing else:** no polling, no network, no change to your notes.

## Without the plugin

Close and reopen the note, or run **Reload app without saving** from the command palette.

## Prior art

- [Image Auto Refresh](https://github.com/matthewjselby/obsidian-image-auto-refresh) by Matt Selby solves the same problem by matching images on their alt text. It is not in the community directory. No code is shared.
- [Refresh Any View](https://community.obsidian.md/plugins/refresh-preview) re-renders a whole view on demand, or automatically when the note's own file changes; it doesn't watch embedded images.

## Install

Manually: copy `main.js` and `manifest.json` into `<vault>/.obsidian/plugins/image-refresh/`, then enable **Image Refresh** under Settings → Community plugins.

## Build

```sh
npm install
npm test
npm run build
```
