const { Configuration, OpenAIApi } = require('openai');
const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');
const fs = require('fs');
require('dotenv').config();

const configuration = new Configuration({
	apiKey: process.env.OPENAI_TOKEN
});
const openai = new OpenAIApi(configuration);
const client = new Client({
	patchVoice: true
});
const context = fs.readFileSync('context.txt', 'utf8');
let joinedVoiceChannel;

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
client.on('ready', async () => {
	console.log(`${client.user.username} is ready!`);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
	if (newState.member.user.id == '1114261843721076766') {
		if (!newState.channelId) {
			if (newState.member.user.id == '1114261843721076766') {
				if (!joinedVoiceChannel) return;
				console.log('Destroying VC');
				await delay(getRandomInt(5000, 20000));
				console.log('Destroy');
				joinedVoiceChannel.destroy();
			}
		} else {
			console.log('Joining VC');
			await delay(getRandomInt(5000, 25000));
			console.log('Joined');
			let voiceChannel = client.channels.cache.get(newState.channelId);
			joinedVoiceChannel = joinVoiceChannel({
				channelId: newState.channelId,
				guildId: newState.guild.id,
				adapterCreator: voiceChannel.guild.voiceAdapterCreator,
				selfDeaf: false
			});
		}
	}
});

client.on('messageCreate', async (message) => {
	if (message.author.bot) return;
	if (message.author.id == client.user.id) return;
	if (message.guildId != '1113161745092055130') return;
	if (!((message.content.toLowerCase().includes('baby') || message.content.toLowerCase().includes('honey') || message.content.toLowerCase().includes('sweetie') || message.content.toLowerCase().includes('mommy')) && message.author.id == '1114261843721076766')) {
		if (!message.content.toLowerCase().includes('catalina') && !message.content.toLowerCase().includes('catty') && !message.content.toLowerCase().includes('catalyna')) {
			return;
		}
	}

	let asker = message.author.username;
	if (message.author.id == '1114261843721076766') {
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

function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
function delay(ms) {
	ms = parseInt(ms);
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
