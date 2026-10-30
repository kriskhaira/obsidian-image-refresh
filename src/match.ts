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

export function parseExtensions(text: string): string[] {
	return text
		.split(",")
		.map((ext) => ext.trim().replace(/^\./, "").toLowerCase())
		.filter(Boolean);
}
