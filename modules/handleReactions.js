const { Configuration, OpenAIApi } = require('openai');
const configuration = new Configuration({
	apiKey: process.env.OPENAI_EMOJI_TOKEN
});
const openai = new OpenAIApi(configuration);
const withEmojis = /\p{Extended_Pictographic}/gu;

async function handleReactions(message) {
	const randomNumber = Math.floor(Math.random() * 100);
	let chanceToReact = 5;
	if (message.author.id == process.env.OWNER_ID) {
		chanceToReact = 100;
	}
	if (!(randomNumber <= chanceToReact)) {
		return;
	}
	try {
		let messages = [];
		messages.unshift({
			role: 'system',
			content: 'Undesteand the meaning of the text and output one or two emoji for it.'
		});
		messages.push({ role: 'user', content: message.content });
		const completion = await openai.createChatCompletion({
			model: 'gpt-3.5-turbo',
			temperature: 0.2,
			max_tokens: 30,
			messages: messages
		});

		let emojyArray = completion.data.choices[0].message.content.match(withEmojis);
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
