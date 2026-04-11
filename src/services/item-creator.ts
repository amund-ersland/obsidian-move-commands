import { App, TFolder } from "obsidian";
import type { NewItemPlan } from "../types";

/**
 * Service responsible for creating new markdown items in the vault.
 *
 * Responsibilities:
 * - Ensure destination folder hierarchy exists
 * - Prevent accidental overwrites
 * - Write note content to disk
 *
 * This class is intentionally small and focused so command/controller code
 * can stay simple and testable.
 */
export class ItemCreatorService {
	private readonly app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Creates a new vault item from a prepared plan.
	 *
	 * @returns The created file path.
	 * @throws Error when the target already exists or creation fails.
	 */
	async createItem(plan: NewItemPlan): Promise<string> {
		const normalizedPath = this.normalizePath(plan.targetPath);
		const folderPath = this.getParentFolderPath(normalizedPath);

		if (folderPath) {
			await this.ensureFolderExists(folderPath);
		}

		const alreadyExists =
			this.app.vault.getAbstractFileByPath(normalizedPath);
		if (alreadyExists) {
			throw new Error(`Target file already exists: ${normalizedPath}`);
		}

		const createdFile = await this.app.vault.create(
			normalizedPath,
			plan.content,
		);
		return createdFile.path;
	}

	/**
	 * Ensures a folder path exists by creating each missing segment.
	 * Supports nested paths like "6-tasks/project-a".
	 */
	private async ensureFolderExists(folderPath: string): Promise<void> {
		const normalized = this.normalizePath(folderPath);
		if (!normalized) return;

		const existing = this.app.vault.getAbstractFileByPath(normalized);
		if (existing) {
			if (!(existing instanceof TFolder)) {
				throw new Error(
					`Target path exists but is not a folder: ${normalized}`,
				);
			}
			return;
		}

		const parts = normalized.split("/").filter(Boolean);
		let current = "";

		for (const part of parts) {
			current = current ? `${current}/${part}` : part;
			const currentEntry = this.app.vault.getAbstractFileByPath(current);

			if (!currentEntry) {
				await this.app.vault.createFolder(current);
				continue;
			}

			if (!(currentEntry instanceof TFolder)) {
				throw new Error(
					`Path segment exists but is not a folder: ${current}`,
				);
			}
		}
	}

	/**
	 * Returns parent folder path for a vault-relative file path.
	 * Example:
	 * - "a/b/file.md" -> "a/b"
	 * - "file.md" -> ""
	 */
	private getParentFolderPath(filePath: string): string {
		const lastSlashIndex = filePath.lastIndexOf("/");
		if (lastSlashIndex < 0) return "";
		return filePath.slice(0, lastSlashIndex);
	}

	/**
	 * Normalizes vault-relative paths:
	 * - trims whitespace
	 * - converts backslashes to forward slashes
	 * - removes repeated slashes
	 * - strips leading/trailing slashes
	 */
	private normalizePath(path: string): string {
		return path
			.trim()
			.replace(/\\/g, "/")
			.replace(/\/+/g, "/")
			.replace(/^\/+/, "")
			.replace(/\/+$/, "");
	}
}
