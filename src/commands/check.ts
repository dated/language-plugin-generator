import { Command } from "@oclif/command";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { addedDiff, deletedDiff } from 'deep-object-diff';

const countKeys = (object, count = 0) => {
	for (const value of Object.values(object)) {
		if (typeof value === "string" || value === undefined) {
			count++;
		} else {
			count = count + countKeys(value);
		}
	}

	return count;
};

export default class Check extends Command {
	static description = "Check for missing translations in translation file";

	static flags = {};

	static args = [{ name: "language" }];

	async run() {
		const { args } = this.parse(Check);

		if (!args.language) {
			throw new Error("Language is required");
		}

		const filePath = path.resolve(process.cwd(), `${args.language}.json`);

		if (!existsSync(filePath)) {
			this.error(`Failed to find translation file for language "${args.language}"`);
		}

		const baseTranslations = require("../base").default;
		try {
			const translations = JSON.parse(readFileSync(filePath, "utf8"));

			const deleted = deletedDiff(baseTranslations, translations.messages);
			const deletedCount = countKeys(deleted);

			const added = addedDiff(baseTranslations, translations.messages);
			const addedCount = countKeys(added);

			if (!deletedCount) {
				this.log("No keys are missing - all good!");
			} else {
				this.log(`${deletedCount} keys are missing\n`);
				this.log(JSON.stringify(deleted, null, 2));
			}

			this.log("\n");

			if (!addedCount) {
				this.log("No keys are outdated - all good!");
			} else {
				this.log(`${countKeys(added)} keys are outdated and can be removed\n`);
				this.log(JSON.stringify(added, null, 2));
			}
		} catch (error) {
			this.error(`Failed to parse translation file for language "${args.language}": ${error}`);
		}
	}
}
