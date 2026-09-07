import { Modal, Setting } from "obsidian";
import type { App } from "obsidian";

export interface TextInputModalConfig {
	/** Modal title. */
	title: string;

	/** Placeholder shown in the empty input. */
	placeholder: string;

	/** Label of the confirming button. */
	submitText: string;

	/** Called with the trimmed value; never called with an empty string. */
	onSubmit: (value: string) => void;
}

/**
 * Single-field prompt.
 *
 * Enter confirms and Escape cancels (the latter via Obsidian's own modal
 * scope), so the dialog can be driven without leaving the keyboard.
 */
export class TextInputModal extends Modal {
	private readonly config: TextInputModalConfig;
	private value = "";

	constructor(app: App, config: TextInputModalConfig) {
		super(app);
		this.config = config;
	}

	onOpen(): void {
		this.setTitle(this.config.title);

		new Setting(this.contentEl).addText((text) => {
			text.setPlaceholder(this.config.placeholder).onChange((value) => {
				this.value = value;
			});

			text.inputEl.addClass("move-commands-text-input");
			text.inputEl.addEventListener("keydown", (event) => {
				if (event.key === "Enter") {
					event.preventDefault();
					this.submit();
				}
			});

			text.inputEl.focus();
		});

		new Setting(this.contentEl)
			.addButton((button) =>
				button.setButtonText("Cancel").onClick(() => this.close()),
			)
			.addButton((button) =>
				button
					.setButtonText(this.config.submitText)
					.setCta()
					.onClick(() => this.submit()),
			);
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private submit(): void {
		const value = this.value.trim();

		if (!value) {
			return;
		}

		this.close();
		this.config.onSubmit(value);
	}
}
