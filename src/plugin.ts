import { Editor, Notice, Plugin, TFile } from "obsidian";

interface BaseFilterValues {
	folder?: string;
	literalProperties: Record<string, string | number | boolean>;
}

interface ParsedBaseBlock {
	startLine: number;
	endLine: number;
	filterValues: BaseFilterValues;
	properties: string[];
	orderKeys: string[];
}

export default class FilebaseHotkeysPlugin extends Plugin {
	async onload(): Promise<void> {
		this.addCommand({
			id: "insert-new-item-from-base-under-cursor",
			name: "Insert new item from base under cursor",
			editorCallback: async (editor: Editor) => {
				await this.insertNewItemFromBaseUnderCursor(editor);
			},
		});
	}

	onunload(): void {
		// Nothing to clean up yet.
	}

	private async insertNewItemFromBaseUnderCursor(
		editor: Editor,
	): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("No active file.");
			return;
		}

		if (!(activeFile instanceof TFile) || activeFile.extension !== "md") {
			new Notice("Active file must be a markdown file.");
			return;
		}

		const cursorLine = editor.getCursor().line;
		const content = await this.app.vault.read(activeFile);
		const lines = content.split(/\r?\n/);

		const block = this.findBaseBlockUnderCursor(lines, cursorLine);
		if (!block) {
			new Notice("No base block found under cursor.");
			return;
		}

		const targetFolder = block.filterValues.folder ?? "";
		const defaultSlug = "some-task";
		const epochSeconds = Math.floor(Date.now() / 1000);
		const fileName = `${epochSeconds}_${defaultSlug}.md`;
		const targetPath = targetFolder
			? `${targetFolder}/${fileName}`
			: fileName;

		if (this.app.vault.getAbstractFileByPath(targetPath)) {
			new Notice(`Target file already exists: ${targetPath}`);
			return;
		}

		try {
			if (targetFolder) {
				await this.ensureFolderExists(targetFolder);
			}

			const fileContent = this.buildFrontmatterContent(
				block.filterValues,
				block.properties,
				block.orderKeys,
			);
			await this.app.vault.create(targetPath, fileContent);

			new Notice(`Created: ${targetPath}`);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : String(error);
			console.error("Failed to create item from base block:", error);
			new Notice(`Could not create new item: ${message}`);
		}
	}

	private findBaseBlockUnderCursor(
		lines: string[],
		cursorLine: number,
	): ParsedBaseBlock | null {
		let i = 0;
		while (i < lines.length) {
			const line = lines[i].trim();
			if (line === "```base") {
				const startLine = i;
				let endLine = -1;
				for (let j = i + 1; j < lines.length; j++) {
					if (lines[j].trim() === "```") {
						endLine = j;
						break;
					}
				}

				if (endLine === -1) {
					break;
				}

				if (cursorLine >= startLine && cursorLine <= endLine) {
					const inner = lines.slice(startLine + 1, endLine);
					const parsed = this.parseBaseYamlLike(inner);
					return {
						startLine,
						endLine,
						filterValues: parsed.filterValues,
						properties: parsed.properties,
						orderKeys: parsed.orderKeys,
					};
				}

				i = endLine + 1;
				continue;
			}

			i++;
		}

		return null;
	}

	private parseBaseYamlLike(innerLines: string[]): {
		filterValues: BaseFilterValues;
		properties: string[];
		orderKeys: string[];
	} {
		const filterValues: BaseFilterValues = {
			literalProperties: {},
		};

		const properties: string[] = [];

		let inFilters = false;
		let filtersIndent = -1;

		let inProperties = false;
		let propertiesIndent = -1;

		let inOrder = false;
		let orderIndent = -1;
		const orderKeys: string[] = [];

		for (const rawLine of innerLines) {
			const indent = this.countLeadingSpaces(rawLine);
			const trimmed = rawLine.trim();

			if (!trimmed || trimmed.startsWith("#")) {
				continue;
			}

			if (trimmed === "filters:" || trimmed.startsWith("filters:")) {
				inFilters = true;
				filtersIndent = indent;
				inProperties = false;
				continue;
			}

			if (
				trimmed === "properties:" ||
				trimmed.startsWith("properties:")
			) {
				inProperties = true;
				propertiesIndent = indent;
				inFilters = false;
				inOrder = false;
				continue;
			}

			if (trimmed === "order:" || trimmed.startsWith("order:")) {
				inOrder = true;
				orderIndent = indent;
				inFilters = false;
				inProperties = false;
				continue;
			}

			if (inFilters && indent <= filtersIndent) {
				inFilters = false;
			}
			if (inProperties && indent <= propertiesIndent) {
				inProperties = false;
			}
			if (inOrder && indent <= orderIndent) {
				inOrder = false;
			}

			if (inProperties) {
				// Accept:
				// - title
				// - "title"
				// title:
				const listMatch = trimmed.match(/^-+\s+(.+)$/);
				if (listMatch) {
					const value = this.stripQuotes(listMatch[1].trim());
					if (value && !properties.includes(value))
						properties.push(value);
					continue;
				}

				const keyMatch = trimmed.match(/^([A-Za-z0-9._-]+)\s*:/);
				if (keyMatch) {
					const key = keyMatch[1];
					if (key && !properties.includes(key)) properties.push(key);
					continue;
				}
			}

			if (inOrder) {
				// Accept:
				// - file.name
				// - status
				// - title
				const orderListMatch = trimmed.match(/^-+\s+(.+)$/);
				if (orderListMatch) {
					const rawKey = this.stripQuotes(orderListMatch[1].trim());
					const key = rawKey
						.replace(/^\+\s*/, "")
						.replace(/^-+\s*/, "")
						.trim();
					if (key && !orderKeys.includes(key)) {
						orderKeys.push(key);
					}
					continue;
				}
			}

			if (inFilters) {
				// Parse patterns like:
				// - file.folder == "6-tasks"
				// - status == "todo"
				// - archived == false
				const equalityMatch = trimmed.match(
					/^(?:-\s*)?([A-Za-z0-9._-]+)\s*==\s*(.+)$/,
				);
				if (equalityMatch) {
					const key = equalityMatch[1].trim();
					const valueRaw = equalityMatch[2].trim();

					const parsedValue = this.parseScalar(valueRaw);

					if (
						key === "file.folder" &&
						typeof parsedValue === "string"
					) {
						filterValues.folder = parsedValue;
					} else {
						filterValues.literalProperties[key] = parsedValue;
					}

					if (
						key !== "file.folder" &&
						!key.startsWith("file.") &&
						!properties.includes(key)
					) {
						properties.push(key);
					}
					continue;
				}
			}
		}

		// Ensure we include literal filter properties in frontmatter keys
		for (const key of Object.keys(filterValues.literalProperties)) {
			if (!key.startsWith("file.") && !properties.includes(key)) {
				properties.push(key);
			}
		}

		for (const key of orderKeys) {
			if (key === "file.folder") continue;
			if (key.startsWith("file.")) continue;
			if (!properties.includes(key)) {
				properties.push(key);
			}
		}

		return { filterValues, properties, orderKeys };
	}

	private parseScalar(valueRaw: string): string | number | boolean {
		const stripped = this.stripQuotes(valueRaw);

		if (/^(true|false)$/i.test(stripped)) {
			return stripped.toLowerCase() === "true";
		}

		if (/^-?\d+(\.\d+)?$/.test(stripped)) {
			const n = Number(stripped);
			if (!Number.isNaN(n)) return n;
		}

		return stripped;
	}

	private stripQuotes(input: string): string {
		if (
			(input.startsWith(`"`) && input.endsWith(`"`)) ||
			(input.startsWith(`'`) && input.endsWith(`'`))
		) {
			return input.slice(1, -1);
		}
		return input;
	}

	private buildFrontmatterContent(
		filterValues: BaseFilterValues,
		properties: string[],
		orderKeys: string[],
	): string {
		const lines: string[] = [];
		lines.push("---");

		// Preserve base order first (from `order:`), then `properties:`, then filter-only keys.
		const orderedKeys: string[] = [];

		for (const key of orderKeys) {
			if (key === "file.folder") continue;
			if (key.startsWith("file.")) continue;
			if (!orderedKeys.includes(key)) orderedKeys.push(key);
		}

		for (const prop of properties) {
			if (prop === "file.folder") continue;
			if (prop.startsWith("file.")) continue;
			if (!orderedKeys.includes(prop)) orderedKeys.push(prop);
		}
		for (const key of Object.keys(filterValues.literalProperties)) {
			if (key === "file.folder") continue;
			if (key.startsWith("file.")) continue;
			if (!orderedKeys.includes(key)) orderedKeys.push(key);
		}

		for (const key of orderedKeys) {
			if (key in filterValues.literalProperties) {
				lines.push(
					`${key}: ${this.stringifyYamlScalar(
						filterValues.literalProperties[key],
					)}`,
				);
			} else {
				lines.push(`${key}: null`);
			}
		}

		if (orderedKeys.length === 0) {
			lines.push("title: null");
		}

		lines.push("---");
		lines.push("");

		return lines.join("\n");
	}

	private stringifyYamlScalar(value: string | number | boolean): string {
		if (typeof value === "string") {
			// Quote strings to avoid YAML ambiguities.
			return JSON.stringify(value);
		}
		return String(value);
	}

	private async ensureFolderExists(path: string): Promise<void> {
		const existing = this.app.vault.getAbstractFileByPath(path);
		if (existing) return;

		const parts = path.split("/").filter(Boolean);
		let current = "";
		for (const part of parts) {
			current = current ? `${current}/${part}` : part;
			if (!this.app.vault.getAbstractFileByPath(current)) {
				await this.app.vault.createFolder(current);
			}
		}
	}

	private countLeadingSpaces(s: string): number {
		let count = 0;
		for (let i = 0; i < s.length; i++) {
			if (s[i] === " ") count++;
			else break;
		}
		return count;
	}
}
