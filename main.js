const { Configuration, OpenAIApi } = require('openai');
const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
require('dotenv').config();

const handleReactions = require('./modules/handleReactions');
const handleVoice = require('./modules/handleVoice');
const methods = require('./modules/methods');
global.delay = methods.delay;
global.getRandomInt = methods.getRandomInt;
global.ownerID = process.env.OWNER_ID;

const configuration = new Configuration({
	apiKey: process.env.OPENAI_TOKEN
});
const openai = new OpenAIApi(configuration);
global.client = new Client({
	captchaService: process.env.CAPCHA_PROVIDER,
	captchaKey: process.env.CAPCHA_PROVIDER_KEY,
	patchVoice: true
});
const context = fs.readFileSync('context.txt', 'utf8');

client.on('ready', async () => {
	console.log(`${client.user.username} is ready!`);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
	await handleVoice(newState);
});

client.on('messageCreate', async (message) => {
	if (message.author.bot) return;
	if (message.author.id == client.user.id) return;
	if (message.guildId != process.env.SERVER_ID) return;

	await handleReactions(message);

	if (!((message.content.toLowerCase().includes('baby') || message.content.toLowerCase().includes('honey') || message.content.toLowerCase().includes('sweetie') || message.content.toLowerCase().includes('mommy')) && message.author.id == ownerID)) {
		if (!message.content.toLowerCase().includes('catalina') && !message.content.toLowerCase().includes('catty') && !message.content.toLowerCase().includes('catalyna')) {
			return;
		}
	}

	let asker = message.author.username;
	if (message.author.id == ownerID) {
		asker = 'your boyfriend Allory';
	}
	let response = await generatePrompt(message.content, asker);

	if (response) {
		let messageChannel = client.channels.cache.get(message.channelId);
		await messageChannel.sendTyping();
		await delay(parseInt(response.length * 25));
		message.reply(response);
	} else {
		message.reply("Sorry, I cant speak. I don't feel ok right now.");
	}
});

client.login(process.env.DISCORD_TOKEN);

async function generatePrompt(question, asker) {
	let prompt = `
You are Catalina, Allory's girlfriend. You guys are in a deep relationship and have sex often. When he talks to you, you usually call him baby, honey or other similar words. You're talking to ${asker} via Discord. Use the given context to answer:
${context}
Question: ${question}
Helpful Answer:`;
	try {
		const completion = await openai.createCompletion({
			model: 'text-davinci-003',
			temperature: 0.1,
			max_tokens: 750,
			prompt: prompt
		});

		return completion.data.choices[0].text;
	} catch (error) {
		if (error.response) {
			console.log(error.response.status);
			console.log(error.response.data);
		} else {
			console.log(error.message);
		}
		return false;
	}
}
