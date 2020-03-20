import { Command } from "@oclif/command";
import { addedDiff } from "deep-object-diff";
import { existsSync, readFileSync } from "fs";
import got from "got";
import path from "path";
import requireFromString from "require-from-string";

import config from "../config";

const countKeys = (object, count = 0): number => {
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

		let baseTranslations;
		try {
			let { body } = await got.get(config.baseTranslationsUrl);

			if (body.startsWith("export default")) {
				body = body.replace("export default", "module.exports =");
			}

			baseTranslations = requireFromString(body);
		} catch (error) {
			this.error(`Failed to fetch base translations: ${error}`);
		}

		try {
			const translations = JSON.parse(readFileSync(filePath, "utf8"));

			const deleted = addedDiff(translations.messages, baseTranslations);
			const deletedCount = countKeys(deleted);

			const added = addedDiff(baseTranslations, translations.messages);
			const addedCount = countKeys(added);

			if (!deletedCount) {
				this.log("No keys are missing - all good!");
			} else {
				this.log(`${deletedCount} keys are missing\n`);
				this.log(JSON.stringify(deleted, null, 2));
			}

			this.log("");

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
