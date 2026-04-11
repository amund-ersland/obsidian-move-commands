import { Plugin } from "obsidian";
import { registerInsertFromBaseCommand } from "./commands/insert-from-base-command";

/**
 * Filebase Hotkeys plugin entrypoint.
 *
 * Keep this class minimal:
 * - plugin lifecycle only
 * - command registration only
 *
 * All feature logic lives in dedicated modules under `src/`.
 */
export default class FilebaseHotkeysPlugin extends Plugin {
	/**
	 * Called by Obsidian when the plugin is enabled.
	 */
	async onload(): Promise<void> {
		registerInsertFromBaseCommand(this);
	}

	/**
	 * Called by Obsidian when the plugin is disabled.
	 * We currently do not keep persistent listeners/intervals beyond command registration.
	 */
	onunload(): void {
		// No teardown required right now.
	}
}
