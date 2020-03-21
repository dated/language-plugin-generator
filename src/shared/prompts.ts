import prompts from "prompts";

export const confirm = async (
	prompt: { message: string; initial?: boolean },
	yesCallback: any,
	noCallback?: any,
): Promise<void> => {
	const { confirm } = await prompts([
		{
			type: "confirm",
			name: "confirm",
			message: prompt.message,
			initial: Boolean(prompt.initial),
		},
	]);

	if (confirm) {
		await yesCallback();
	} else if (noCallback) {
		await noCallback();
	}
};
