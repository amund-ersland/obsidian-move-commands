/**
 * Error helpers.
 *
 * `catch` bindings are `unknown` under `strict`, and Obsidian's vault APIs
 * reject with a mix of `Error` objects and plain strings, so every user-facing
 * message goes through here.
 */

/** Best-effort human-readable description of a thrown value. */
export function describeError(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	if (typeof error === "string") {
		return error;
	}

	return String(error);
}
