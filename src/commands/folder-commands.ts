import type { App } from "obsidian";
import { FOLDER_COMMAND_ID_PREFIX } from "../constants";
import { mappingToChoice } from "../services/folder-choices";
import { runFileOperation } from "./file-operation-runner";
import type MoveCommandsPlugin from "../main";

/**
 * `app.commands.removeCommand` is not part of the public API, but Obsidian
 * exposes no supported way to retract a command once added — which is exactly
 * what deleting a folder mapping requires. The access is narrowed to this file
 * and optional throughout, so an API change degrades to a stale command in the
 * palette rather than a broken plugin.
 */
type AppWithCommands = App & {
	commands?: { removeCommand?: (id: string) => void };
};

/**
 * Keeps one command per configured folder mapping.
 *
 * Command IDs are derived from the mapping ID (`move-to-<id>`) and must stay
 * stable: they are what the user's hotkeys point at.
 */
export class FolderCommandRegistry {
	private readonly plugin: MoveCommandsPlugin;
	private readonly registeredIds = new Set<string>();

	constructor(plugin: MoveCommandsPlugin) {
		this.plugin = plugin;
	}

	/** Rebuilds the command set from current settings. */
	refresh(): void {
		this.removeAll();

		for (const mapping of this.plugin.settings.folderMappings) {
			// A mapping without a folder is an unfinished settings row.
			if (!mapping.folderPath) {
				continue;
			}

			const commandId = `${FOLDER_COMMAND_ID_PREFIX}${mapping.id}`;
			const choice = mappingToChoice(mapping);
			const verb = choice.operation === "copy" ? "Copy" : "Move";

			this.plugin.addCommand({
				id: commandId,
				name: `${verb} current file to ${choice.label}`,
				callback: () => {
					void runFileOperation(this.plugin.app, choice);
				},
			});

			this.registeredIds.add(commandId);
		}
	}

	/** Drops every command this registry added. */
	removeAll(): void {
		const { commands } = this.plugin.app as AppWithCommands;

		for (const commandId of this.registeredIds) {
			commands?.removeCommand?.(
				`${this.plugin.manifest.id}:${commandId}`,
			);
		}

		this.registeredIds.clear();
	}
}
