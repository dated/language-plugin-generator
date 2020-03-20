import { Command, flags } from "@oclif/command";
import { existsSync, writeFileSync } from "fs";
import { ensureDirSync, writeJsonSync } from "fs-extra";
import path from "path";
import prompts from "prompts";

import config from "../config";

const basePath = path.resolve(process.cwd());

export default class New extends Command {
	static description = "Bootstrap a new Language Plugin";

	public static flags: Record<string, any> = {
		name: flags.string({
			description: "The package name of your plugin",
		}),
	};

	async run() {
		const { flags } = this.parse(New);

		const packageJson = config.pluginConfig;

		let response;

		if (!flags.name) {
			response = await prompts({
				type: "text",
				name: "name",
				message: "Package name",
				validate: value => ((!!value || value.length) < 1 ? "You must provide a name" : true),
			});
		}

		packageJson.name = flags.name || response.name;

		if (!packageJson.name) {
			this.error("Failed to create plugin: you must provide a package name");
		}

		response = await prompts([
			{
				type: "text",
				name: "author",
				message: "Plugin author",
			},
			{
				type: "text",
				name: "title",
				message: "Plugin title",
			},
			{
				type: "text",
				name: "repository",
				message: "GitHub repository URL",
			},
			{
				type: "text",
				name: "languageId",
				message: "ID of the language",
			},
			{
				type: "text",
				name: "languageName",
				message: "Name of the language",
			},
		]);

		if (!response.languageId) {
			this.error("Failed to create plugin: you must provide a language ID");
		}

		packageJson.author = response.author;
		packageJson.bugs.url = `${response.repository}/issues`;
		packageJson.homepage = `${response.repository}#readme`;
		packageJson.repository.url = `git+${response.repository}.git`;

		const pluginPath = path.join(basePath, `${packageJson.name}`);

		if (existsSync(pluginPath)) {
			this.error(`Failed to create plugin: directory "${packageJson.name}" exists already`);
		}

		const sourcePath = path.join(pluginPath, "src");
		const languagesPath = path.join(sourcePath, "languages");

		ensureDirSync(languagesPath);

		writeJsonSync(path.join(pluginPath, "package.json"), packageJson, { spaces: 2 });

		writeFileSync(
			path.join(sourcePath, "index.js"),
			`module.exports = {
  getLanguages () {
    return {
      '${response.languageId}': {
        languagePath: 'languages/${response.languageId}.json',
        name: '${response.languageName || response.languageId}'
      }
    }
  }
}`,
			{ encoding: "utf8" },
		);

		writeJsonSync(
			path.join(languagesPath, `${response.languageId}.json`),
			{
				dateTimeFormats: {},
				numberFormats: {},
				messages: {},
			},
			{ spaces: 2 },
		);
	}
}
