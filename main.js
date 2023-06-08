const { Client } = require('discord.js-selfbot-v13');

require('dotenv').config();

const handleReactions = require('./modules/handleReactions');
const handleVoice = require('./modules/handleVoice');
const handlePrompt = require('./modules/handlePrompt');
const methods = require('./modules/methods');

global.delay = methods.delay;
global.getRandomInt = methods.getRandomInt;
global.ownerID = process.env.OWNER_ID;
global.knownUsers = {};

global.client = new Client({
	captchaService: process.env.CAPCHA_PROVIDER,
	captchaKey: process.env.CAPCHA_PROVIDER_KEY,
	patchVoice: true
});

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

	if (message?.reference?.messageId) {
		let reply = await message.channel.messages.fetch(message.reference.messageId);
		let replyUserId = reply.author.id;
		if (replyUserId == client.user.id) {
			await handlePrompt(message);
			return;
		}
	}

	if (!((message.content.toLowerCase().includes('baby') || message.content.toLowerCase().includes('honey') || message.content.toLowerCase().includes('sweetie') || message.content.toLowerCase().includes('mommy')) && message.author.id == ownerID)) {
		if (!message.content.toLowerCase().includes('catalina') && !message.content.toLowerCase().includes('cătălina') && !message.content.toLowerCase().includes('catty') && !message.content.toLowerCase().includes('catalyna')) {
			return;
		}
	}

	await handlePrompt(message);
});

client.login(process.env.DISCORD_TOKEN);
