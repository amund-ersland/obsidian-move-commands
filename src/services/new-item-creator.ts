import { App } from "obsidian";
import { NewItemPlan } from "../types";
import { ItemCreatorService } from "./item-creator";

/**
 * Thin service wrapper used by command handlers to create new vault items.
 *
 * Keeping this as a separate function gives us:
 * - a single import point for "create item" behavior
 * - easy future extension (logging, metrics, retries, hooks)
 * - command files that stay focused on orchestration
 */
export async function createNewItemFromPlan(
	app: App,
	plan: NewItemPlan,
): Promise<string> {
	const itemCreator = new ItemCreatorService(app);
	return itemCreator.createItem(plan);
}
