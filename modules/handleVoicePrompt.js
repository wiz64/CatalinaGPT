const { Configuration, OpenAIApi } = require('openai');
const { createReadStream } = require('node:fs');
const { createAudioResource, createAudioPlayer, demuxProbe, StreamType } = require('@discordjs/voice');
const voice = require('elevenlabs-node');
const fs = require('fs');

const botcontext = require('../context');
const configuration = new Configuration({
	apiKey: process.env.OPENAI_TOKEN
});

const openai = new OpenAIApi(configuration);

const voiceID = '21m00Tcm4TlvDq8ikWAM';
let key = null;
let keys = [];

async function handleVoicePrompt(message) {
	const response = await generateVoicePrompt(message);

	if (response.length < 200) {
		if (!key) {
			if (process.env.ELEVENLABS_TOKEN.includes(',') && keys.length == 0) {
				keys = process.env.ELEVENLABS_TOKEN.split(',');
				key = keys[0];
				keys.shift();
			} else {
				key = process.env.ELEVENLABS_TOKEN;
			}
		}
		try {
			await voice.editVoiceSettings(key, voiceID, 1, 0.63);
			const player = createAudioPlayer();
			let res = await voice.textToSpeechStream(key, voiceID, response);
			const mp3Stream = await probeAndCreateResource(res);
			player.play(mp3Stream);
			connection.subscribe(player);
			return;
		} catch (error) {
			console.log('Error getting voice message');
			if (keys.length >= 1) {
				key = keys[0];
				keys.shift();
			} else {
				key = null;
			}
		}
	}

	let messageChannel = client.channels.cache.get(message.channelId);
	await messageChannel.sendTyping();
	await delay(parseInt(response.length * 25));
	message.reply(response);
	return;
}

async function generateVoicePrompt(discordMessage) {
	let askerUsername = discordMessage.author.username.replace(/[^a-zA-Z ]/g, '');
	let userId = discordMessage.author.id;
	let user = botcontext.other_users.whois + askerUsername;
	let userBehaviour = botcontext.other_users.user_context;
	let replyHistory = '';
	if (discordMessage?.reference?.messageId) {
		let reply = await discordMessage.channel.messages.fetch(discordMessage.reference.messageId);
		let replyUsername = reply.author.username.replace(/[^a-zA-Z ]/g, '');
		let replyContent = reply.content;
		replyHistory = `History: ${replyUsername}: ${replyContent}`;
		if (reply?.reference?.messageId) {
			let replySecond = await reply.channel.messages.fetch(reply.reference.messageId);
			let replyUsername = replySecond.author.username.replace(/[^a-zA-Z ]/g, '');
			let replyContent = replySecond.content;
			replyHistory = replyHistory + `\n${replyUsername}: ${replyContent}`;
		}
	}

	if (botcontext.processedContext[userId]) {
		user = botcontext.processedContext[userId].whois + askerUsername;
		userBehaviour = botcontext.processedContext[userId].user_context;
	}
	if (replyHistory) {
		user = 'Current Message: ' + user;
	}

	let prompt = `${botcontext.about}

Impersonate: ${botcontext.behaviour}
Optional to Impersionate: ${userBehaviour}

${replyHistory}
${user}: ${discordMessage.content}

Your direct response in chat:`;
	let errorStatus = 429;
	let retryCounter = 0;
	while (errorStatus == 429 && retryCounter < 4) {
		retryCounter += 1;
		errorStatus = 0;
		try {
			const completion = await openai.createCompletion({
				model: 'text-davinci-003',
				temperature: 0.85,
				max_tokens: 500,
				prompt: prompt
			});
			return completion.data.choices[0].text.replace('CattyCatalina:', '');
		} catch (error) {
			console.log('Errror prompting ' + retryCounter);
			if (error.response) {
				errorStatus = error.response.status;
				if (errorStatus != 429) {
					console.log(error.response.status);
					console.log(error.response.data);
				}
			} else {
				console.log(error.message);
			}
		}
		await delay(2000);
	}
	return false;
}
async function probeAndCreateResource(readableStream) {
	const { stream, type } = await demuxProbe(readableStream);
	return createAudioResource(stream, { inputType: type });
}

module.exports = handleVoicePrompt;
