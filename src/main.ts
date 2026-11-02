import { App, MarkdownView, Menu, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile, Workspace, getLinkpath } from "obsidian";
import { DEFAULT_EXTENSIONS, embedLinktext, isWatchedExtension, parseExtensions, refreshedSrc } from "./match.ts";

// Core's link menu (Open in new tab, Copy path, Reveal in Finder…). Not in the public API, so it is optional.
type LinkMenuWorkspace = Workspace & {
	handleLinkContextMenu?: (menu: Menu, linktext: string, sourcePath: string) => boolean;
};

interface EmbeddedImage {
	file: TFile;
	linktext: string;
	sourcePath: string;
}

interface ImageRefreshSettings {
	extensions: string[];
	themeZoomOff: boolean;
}

// The theme fix is opt-in: it only matters with Minimal-style themes, and it changes how the theme behaves.
const DEFAULT_SETTINGS: ImageRefreshSettings = { extensions: DEFAULT_EXTENSIONS, themeZoomOff: false };

// The off switch of the hold-to-zoom feature in the Minimal theme and themes that copy it (Border).
// Since Obsidian 1.14 wraps each image in .image-wrapper, that feature shrinks the picture to 0×0 while the
// mouse button is held, so the click lands on the empty embed: clicks on the image and on its zoom and </>
// buttons do nothing. Obsidian 1.14 has its own zoom (click the image, then click again or use the zoom button).
const THEME_ZOOM_OFF = "zoom-off";

export default class ImageRefreshPlugin extends Plugin {
	settings: ImageRefreshSettings = DEFAULT_SETTINGS;

	async onload() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.addSettingTab(new ImageRefreshSettingTab(this.app, this));

		// "create" as well as "modify": some writers replace a file by renaming a temp copy over it.
		this.registerEvent(this.app.vault.on("modify", (file) => this.refresh(file)));
		this.registerEvent(this.app.vault.on("create", (file) => this.refresh(file)));

		// Each window: the right-click menu, and the theme's hold-to-zoom switched off.
		this.setUpDocument(document);
		this.app.workspace.onLayoutReady(() => this.documents().forEach((doc) => this.setUpDocument(doc)));
		this.registerEvent(this.app.workspace.on("window-open", (_win, win) => this.setUpDocument(win.document)));
		this.register(() => this.zoomOffDocs.forEach((doc) => doc.body.removeClass(THEME_ZOOM_OFF)));
	}

	private setUpDocs = new WeakSet<Document>();
	// Windows where this plugin added the class, so unloading never removes one that a theme setting added.
	private zoomOffDocs = new Set<Document>();

	setUpDocument(doc: Document) {
		if (this.setUpDocs.has(doc)) return;
		this.setUpDocs.add(doc);
		this.listenForContextMenu(doc);
		this.applyThemeZoomOff(doc);
	}

	applyThemeZoomOff(doc: Document) {
		if (this.settings.themeZoomOff && !doc.body.hasClass(THEME_ZOOM_OFF)) {
			doc.body.addClass(THEME_ZOOM_OFF);
			this.zoomOffDocs.add(doc);
		} else if (!this.settings.themeZoomOff && this.zoomOffDocs.has(doc)) {
			doc.body.removeClass(THEME_ZOOM_OFF);
			this.zoomOffDocs.delete(doc);
		}
	}

	// Capture phase, so it runs before the editor's own handler, which would show the text-editing menu.
	listenForContextMenu(doc: Document) {
		this.registerDomEvent(
			doc,
			"contextmenu",
			(evt: MouseEvent) => {
				const menu = this.imageMenu(evt.target);
				if (!menu) return;
				evt.preventDefault();
				evt.stopPropagation();
				menu.showAtMouseEvent(evt);
			},
			{ capture: true },
		);
	}

	// The menu for a right-click target, or null when it is not an embedded vault image (the normal menu then shows).
	imageMenu(target: EventTarget | null): Menu | null {
		const image = this.embeddedImage(target);
		if (!image) return null;
		const menu = new Menu();
		const workspace = this.app.workspace as LinkMenuWorkspace;
		if (typeof workspace.handleLinkContextMenu === "function") {
			workspace.handleLinkContextMenu(menu, image.linktext, image.sourcePath);
		} else {
			this.app.workspace.trigger("file-menu", menu, image.file, "image-context-menu");
		}
		return menu;
	}

	embeddedImage(target: EventTarget | null): EmbeddedImage | null {
		const el = target as HTMLElement | null;
		if (!el || typeof el.closest !== "function") return null;
		// Anywhere in the embed, not just the <img>: the resize corner and the hover toolbar sit on top of the picture.
		const embed = el.closest<HTMLElement>(".internal-embed[src]");
		if (!embed || !embed.querySelector("img") || !embed.closest(".markdown-source-view, .markdown-preview-view")) return null;
		const linktext = embedLinktext(embed.getAttribute("src"));
		if (!linktext) return null;
		const sourcePath = this.sourcePathOf(embed);
		const file = this.app.metadataCache.getFirstLinkpathDest(getLinkpath(linktext), sourcePath);
		if (!file || !isWatchedExtension(file.extension, this.settings.extensions)) return null;
		return { file, linktext, sourcePath };
	}

	// The note whose view holds the element; the active note for hover popovers and other non-leaf views.
	sourcePathOf(el: HTMLElement): string {
		let path: string | null = null;
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (!path && leaf.view instanceof MarkdownView && leaf.view.containerEl.contains(el)) path = leaf.view.file?.path ?? null;
		});
		return path ?? this.app.workspace.getActiveFile()?.path ?? "";
	}

	refresh(file: TAbstractFile): number {
		if (!(file instanceof TFile) || !isWatchedExtension(file.extension, this.settings.extensions)) return 0;
		const fresh = this.app.vault.getResourcePath(file);
		const stamp = Date.now();
		let count = 0;
		for (const doc of this.documents()) {
			doc.querySelectorAll("img").forEach((img) => {
				const src = refreshedSrc(img.getAttribute("src") ?? "", fresh, stamp);
				if (src) {
					img.setAttribute("src", src);
					count++;
				}
			});
		}
		return count;
	}

	// The main window plus any pop-out windows.
	documents(): Set<Document> {
		const docs = new Set<Document>([document]);
		this.app.workspace.iterateAllLeaves((leaf) => docs.add(leaf.view.containerEl.ownerDocument));
		return docs;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class ImageRefreshSettingTab extends PluginSettingTab {
	plugin: ImageRefreshPlugin;

	constructor(app: App, plugin: ImageRefreshPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		this.containerEl.empty();
		new Setting(this.containerEl)
			.setName("Image extensions")
			.setDesc("Comma-separated. An embedded file with one of these extensions is redrawn when it changes on disk, and a right-click on it opens its file menu.")
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_EXTENSIONS.join(", "))
					.setValue(this.plugin.settings.extensions.join(", "))
					.onChange(async (value) => {
						const parsed = parseExtensions(value);
						this.plugin.settings.extensions = parsed.length ? parsed : DEFAULT_EXTENSIONS;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(this.containerEl)
			.setName("Turn off the theme's hold-to-zoom")
			.setDesc(
				"Adds the theme's own 'zoom-off' switch (Minimal, Border). In Obsidian 1.14 that theme feature shrinks an image to nothing while the mouse is held, so clicks on the image and its zoom and </> buttons do nothing.",
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.themeZoomOff).onChange(async (value) => {
					this.plugin.settings.themeZoomOff = value;
					await this.plugin.saveSettings();
					this.plugin.documents().forEach((doc) => this.plugin.applyThemeZoomOff(doc));
				}),
			);
	}
}
