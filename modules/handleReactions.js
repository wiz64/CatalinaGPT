const { Configuration, OpenAIApi } = require('openai');
const configuration = new Configuration({
	apiKey: process.env.OPENAI_EMOJI_TOKEN
});
const openai = new OpenAIApi(configuration);
const withEmojis = /\p{Extended_Pictographic}/gu;

async function handleReactions(message) {
	const randomNumber = Math.floor(Math.random() * 100);
	let chanceToReact = 10;
	if (message.author.id == client.user.id) {
		chanceToReact = 15;
		message.content = 'Message received from your boyfriend:' + message.content;
	}
	if (!(randomNumber <= chanceToReact)) {
		return;
	}
	try {
		let prompt = `Give one or more emojies for this: ${message.content}`;
		const completion = await openai.createCompletion({
			model: 'text-davinci-003',
			temperature: 0.1,
			max_tokens: 50,
			prompt: prompt
		});
		let emojyArray = completion.data.choices[0].text.match(withEmojis);

		if (!emojyArray) return;
		if (Math.floor(Math.random() * 100) > 31) {
			emojyArray = [emojyArray[0]];
		}
		for (var i = 0; i < emojyArray.length; i++) {
			await message.react(emojyArray[i]);
		}
	} catch (error) {
		console.log(`Error while doing an emojy reaction: ${error.message}`);
	}
}

module.exports = handleReactions;
