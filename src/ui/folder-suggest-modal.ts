import { FuzzySuggestModal } from "obsidian";
import type { App } from "obsidian";
import type { FolderChoice } from "../types";

/**
 * Fuzzy destination picker.
 *
 * Built on `FuzzySuggestModal` so keyboard navigation, filtering, and match
 * highlighting come from Obsidian itself and match the rest of the app.
 */
export class FolderSuggestModal extends FuzzySuggestModal<FolderChoice> {
	private readonly choices: FolderChoice[];
	private readonly onChoose: (choice: FolderChoice) => void;

	constructor(
		app: App,
		choices: FolderChoice[],
		placeholder: string,
		onChoose: (choice: FolderChoice) => void,
	) {
		super(app);
		this.choices = choices;
		this.onChoose = onChoose;
		this.setPlaceholder(placeholder);
		this.setInstructions([
			{ command: "↑↓", purpose: "to navigate" },
			{ command: "↵", purpose: "to select" },
			{ command: "esc", purpose: "to dismiss" },
		]);
	}

	getItems(): FolderChoice[] {
		return this.choices;
	}

	/** Includes the path so a destination can be found by either name or path. */
	getItemText(choice: FolderChoice): string {
		return `${choice.label} · ${choice.folderPath || "/"}`;
	}

	onChooseItem(choice: FolderChoice): void {
		this.onChoose(choice);
	}
}
