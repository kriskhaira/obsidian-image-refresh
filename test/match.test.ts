import assert from "node:assert/strict";
import { embedLinktext, parseExtensions, refreshedSrc, resourceKey } from "../src/match.ts";

const base = "app://16f4/Users/k/Notes/Friends/Jane%20Doe/Attachments/Photo%20(wrong,%20IMG_0001).jpg";

// Same file, old mtime → new src with the new stamp.
assert.equal(refreshedSrc(`${base}?1700`, `${base}?1800`, 1900), `${base}?1900`);

// Encoded and decoded forms of the same path match.
assert.equal(
	refreshedSrc("app://16f4/Users/k/Notes/Friends/Jane Doe/Attachments/Photo (wrong, IMG_0001).jpg?1700", `${base}?1800`, 1900),
	`${base}?1900`,
);

// A different file is left alone, including one whose name is a prefix of it.
assert.equal(refreshedSrc(`${base.replace("IMG_0001", "IMG_0002")}?1700`, `${base}?1800`, 1900), null);
assert.equal(refreshedSrc("app://16f4/Users/k/Notes/a.jpg?1", "app://16f4/Users/k/Notes/a.jpg.png?2", 3), null);

// Empty and web images are left alone.
assert.equal(refreshedSrc("", `${base}?1800`, 1900), null);
assert.equal(refreshedSrc("https://example.com/a.jpg", `${base}?1800`, 1900), null);

assert.equal(resourceKey("app://x/a%20b.png?12#frag"), "app://x/a b.png");
assert.deepEqual(parseExtensions(" PNG, .jpg,,svg "), ["png", "jpg", "svg"]);

// The right-click menu resolves an embed's link text; web addresses and empty sources are skipped.
assert.equal(embedLinktext(" 2026-10-31 Jane's PC — screenshot.jpg "), "2026-10-31 Jane's PC — screenshot.jpg");
assert.equal(embedLinktext("Attachments/photo.jpg#crop"), "Attachments/photo.jpg#crop");
assert.equal(embedLinktext("https://example.com/a.jpg"), null);
assert.equal(embedLinktext(""), null);
assert.equal(embedLinktext(null), null);

console.log("match tests passed");
