import { Notice, Plugin } from "obsidian";
import { registerInsertFromBaseCommand } from "./commands/insert-from-base-command";
import { BaseViewAddItemButtonController } from "./ui/base-view-add-item-button";

/**
 * Filebase Hotkeys plugin entrypoint.
 *
 * Keep this class minimal:
 * - plugin lifecycle only
 * - command/UI registration only
 *
 * All feature logic lives in dedicated modules under `src/`.
 */
export default class FilebaseHotkeysPlugin extends Plugin {
	private baseViewAddItemButtonController: BaseViewAddItemButtonController | null =
		null;

	/**
	 * Called by Obsidian when the plugin is enabled.
	 */
	async onload(): Promise<void> {
		registerInsertFromBaseCommand(this);

		this.baseViewAddItemButtonController =
			new BaseViewAddItemButtonController(this);
		this.baseViewAddItemButtonController.enable();

		new Notice("Filebase Hotkeys: base add-item button controller active.");
	}

	/**
	 * Called by Obsidian when the plugin is disabled.
	 */
	onunload(): void {
		if (this.baseViewAddItemButtonController) {
			this.baseViewAddItemButtonController.disable();
			this.baseViewAddItemButtonController = null;
		}
	}
}
