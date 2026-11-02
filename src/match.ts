// Pure helpers, kept free of the Obsidian API so they can be tested with plain Node.

export const DEFAULT_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"];

// A resource URL without its cache-busting query, decoded so that
// "Jane%20Doe" and "Jane Doe" compare equal.
export function resourceKey(url: string): string {
	const bare = url.split(/[?#]/)[0];
	try {
		return decodeURI(bare);
	} catch {
		return bare;
	}
}

export function isWatchedExtension(extension: string, extensions: string[]): boolean {
	return extensions.includes(extension.toLowerCase());
}

// The new src for an image that showed `oldSrc`, or null when it shows some other file.
// The stamp is always new, even when Obsidian's mtime has not moved yet.
export function refreshedSrc(oldSrc: string, freshResource: string, stamp: number): string | null {
	if (!oldSrc || resourceKey(oldSrc) !== resourceKey(freshResource)) return null;
	return `${freshResource.split(/[?#]/)[0]}?${stamp}`;
}

// The link text in an internal embed's `src` attribute (`![[photo.jpg|300]]` → "photo.jpg"),
// or null when there is none or it is a web address rather than a vault link.
export function embedLinktext(src: string | null): string | null {
	const text = (src ?? "").trim();
	if (!text || /^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return null;
	return text;
}

export function parseExtensions(text: string): string[] {
	return text
		.split(",")
		.map((ext) => ext.trim().replace(/^\./, "").toLowerCase())
		.filter(Boolean);
}
