import { App, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile } from "obsidian";
import { DEFAULT_EXTENSIONS, isWatchedExtension, parseExtensions, refreshedSrc } from "./match.ts";

interface ImageRefreshSettings {
	extensions: string[];
}

const DEFAULT_SETTINGS: ImageRefreshSettings = { extensions: DEFAULT_EXTENSIONS };

export default class ImageRefreshPlugin extends Plugin {
	settings: ImageRefreshSettings = DEFAULT_SETTINGS;

	async onload() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.addSettingTab(new ImageRefreshSettingTab(this.app, this));

		// "create" as well as "modify": some writers replace a file by renaming a temp copy over it.
		this.registerEvent(this.app.vault.on("modify", (file) => this.refresh(file)));
		this.registerEvent(this.app.vault.on("create", (file) => this.refresh(file)));
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
			.setDesc("Comma-separated. An embedded file with one of these extensions is redrawn when it changes on disk.")
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
	}
}
