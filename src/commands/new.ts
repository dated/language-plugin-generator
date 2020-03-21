import { Command, flags } from "@oclif/command";
import cli from "cli-ux";
import { existsSync, writeFileSync } from "fs";
import { ensureDirSync, writeJsonSync } from "fs-extra";
import path from "path";
import prompts from "prompts";

import config from "../config";
import { confirm } from "../shared/prompts";

const basePath = path.resolve(process.cwd());

export default class New extends Command {
	static description = "bootstrap a new Language Plugin";

	public static flags: Record<string, any> = {
		name: flags.string({
			description: "The package name of your plugin",
		}),
	};

	async run() {
		const { flags } = this.parse(New);

		const packageJson = config.pluginConfig;

		this.log("Please provide some basic information about the plugin.");
		this.log("You will be able to change all values afterwards by editing the created 'package.json' file.\n");

		let response;

		if (!flags.name) {
			response = await prompts({
				type: "text",
				name: "name",
				message: "The name of the package",
				validate: value => ((!!value || value.length) < 1 ? "The package name cannot be empty" : true),
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
				message: "The author of the plugin",
			},
			{
				type: "text",
				name: "title",
				message: "The title of the plugin",
			},
			{
				type: "text",
				name: "repository",
				message: "URL ",
			},
			{
				type: "text",
				name: "languageId",
				message: "ID of the language (e.g. 'it-IT')",
			},
			{
				type: "text",
				name: "languageName",
				message: "Name of the language (e.g. 'Italian')",
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

		await confirm(
			{ message: `Do you want to bootstrap the "${packageJson.name}" plugin now?`, initial: true },
			() => {
				try {
					cli.action.start(`Bootstrapping "${packageJson.name}" plugin`);

					ensureDirSync(languagesPath);

					writeJsonSync(path.join(pluginPath, "package.json"), packageJson, { spaces: 2 });

					writeFileSync(
						path.join(sourcePath, "index.js"),
						[
							"module.exports = {",
							"  getLanguages () {",
							"    return {",
							`      '${response.languageId}': {`,
							`        languagePath: 'languages/${response.languageId}.json',`,
							`        name: '${response.languageName || response.languageId}'`,
							"      }",
							"    }",
							"  }",
							"}",
							"",
						].join("\n"),
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
				} catch (error) {
					this.error(`Failed to create plugin: ${error}`);
				} finally {
					cli.action.stop("done");
				}
			},
		);
	}
}
