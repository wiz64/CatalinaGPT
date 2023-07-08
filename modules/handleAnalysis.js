const fs = require('fs');
const { Configuration, OpenAIApi } = require('openai');
const configuration = new Configuration({
	apiKey: process.env.OPENAI_TOKEN
});

const openai = new OpenAIApi(configuration);

async function handleAnalysis(message) {
	let wasTriggered = false;
	if (message.content.includes('analyze')) {
		wasTriggered = true;
		let mentioned = message.mentions.users.first();
		if (!mentioned && message.content.split(' ')[2]) {
			mentioned = message.content.split(' ')[2];
		}

		if (mentioned) {
			await initUserAnalyzer(message, mentioned);
		} else {
			await initGeneralAnalyzer(message);
		}
	}
	return wasTriggered;
}
async function initUserAnalyzer(discordMessage, uid) {
	let logMessage = await discordMessage.reply('Scanning for User....');
	let userMessages = [];
	for (const channel of discordMessage.guild.channels.cache.values()) {
		if (channel.type != 'GUILD_TEXT') continue;
		if (!channel.messages) continue;
		const permissions = channel.permissionsFor(client.user);
		if (!(permissions.has('VIEW_CHANNEL') && permissions.has('READ_MESSAGE_HISTORY'))) continue;

		for await (const message of loadAllMessages(channel)) {
			if (message.author.bot || message.content == '' || message.content.length < 70 || message.author.id != uid) continue;
			userMessages.push(message);
		}
	}
	if (userMessages.length == 0) {
		logMessage.edit('I had not detected messages from that user.');
		return;
	}
	let result = await generateUserScore(userMessages.join('.'), true);
	logMessage.edit(`Analisys for ${uid}:\n${result}`);
}

async function initGeneralAnalyzer(discordMessage) {
	let logMessage = await discordMessage.reply('Working....');

	let scrapedMessages = [];

	for (const channel of discordMessage.guild.channels.cache.values()) {
		if (channel.type != 'GUILD_TEXT') continue;
		if (!channel.messages) continue;
		const permissions = channel.permissionsFor(client.user);
		if (!(permissions.has('VIEW_CHANNEL') && permissions.has('READ_MESSAGE_HISTORY'))) continue;

		for await (const message of loadAllMessages(channel)) {
			if (message.author.bot || message.content == '' || message.content.length < 70) continue;
			scrapedMessages.push(message);
		}
	}
	let filteredMessages = await filterMessages(scrapedMessages);

	await generateAiScore(filteredMessages, logMessage);
}

async function generateAiScore(filteredMessages, editMessage) {
	let uids = Object.keys(filteredMessages);
	let organizedScore = [];
	for (const uid of uids) {
		let score = await generateUserScore(filteredMessages[uid]);

		if (isNaN(parseInt(score))) {
			console.log(`Error in analysis for ${uid}: ${score}`);
			continue;
		}
		organizedScore.push({ score: parseInt(score), memberUid: uid });
		organizedScore.sort(function (a, b) {
			return parseFloat(b.score) - parseFloat(a.score);
		});
		let message = '';
		for (var i = 0; i < organizedScore.length; i++) {
			if (i > 25) break;
			let user = client.users.cache.get(organizedScore[i].memberUid);
			if (user && user.username) {
				user = user.username;
			} else {
				user = organizedScore[i].memberUid;
			}
			message += `\n **${user}** - ${organizedScore[i].score}`;
		}
		editMessage.edit(message);
	}
	let message = '';
	for (var i = 0; i < organizedScore.length; i++) {
		let user = client.users.cache.get(organizedScore[i].memberUid);
		if (user && user.username) {
			user = user.username;
		} else {
			user = organizedScore[i].memberUid;
		}
		message += `\n ${user} [${organizedScore[i].memberUid}] - ${organizedScore[i].score}`;
	}
	fs.writeFileSync('last-analisys.txt', message);
}
async function generateUserScore(message, advanced) {
	let openAiChat = [];
	let systemInstruct = {
		role: 'system',
		content:
			'Evaluate the text sent by a user and assign a score based on the quality of their expertise. Traits for a higher score include being helpful, having a business (important), being an entrepreneur, possessing a good skill set (such as marketing, sales, etc.), and having a combination of multiple skills. Users that have potential to make a business worth 1 million USD will be granted with score over 50. Users will receive a lower score if they are beginners, ask questions that can be easily searched on Google, lack expertise or if the text has any problems. Reward users with higher scores if they exhibit rare typologies. Be highly selective, critical, and subjective in the analysis. Only output one score ranging from 0 (low quality user) to 100 (top quality user). Always output one single number with no letters!'
	};
	let limit = 3000;
	if (advanced) {
		limit = 5000;
		systemInstruct = {
			role: 'system',
			content:
				'Understeand the text sent by a user and assign a score based on the quality of their skills and expertise. Traits for a higher score include being helpful, having a business (important), being an entrepreneur, possessing a good skill set (such as marketing, sales, etc.), actively involved, demonstrating niche skills, speaking from experience, and having a combination of multiple skills. User will receive a score close to 0 if they are beginners, ask questions that can be easily searched on Google, or lack expertise. You will also assign a 0 score if you cant do an impression or extract detaliated info about the user based to the text. Reward user with higher scores if they exhibit very rare typologies. Be highly selective and critical in the analysis. Only output one accurate score ranging from 0 (low quality user) to 100 (top quality user).Output the data like this: Score: ${score} \n User Analysis: ${details}'
		};
	}

	openAiChat.unshift(systemInstruct);
	message = message.replace(/\n/g, ' ');
	if (message.length > limit) {
		message = message.slice(-limit);
	}

	openAiChat.unshift({ role: 'user', content: message });
	try {
		const completion = await openai.createChatCompletion({
			model: 'gpt-3.5-turbo',
			temperature: 0.1,
			messages: openAiChat
		});
		console.log(`Total Analysis Tokens: ${completion.data.usage.total_tokens} - ${parseFloat(parseInt(completion.data.usage.total_tokens) * 0.000002).toFixed(4)}$`);
		return completion.data.choices[0].message.content;
	} catch (error) {
		console.log(`Error while assigning score ${error}`);
		return 0;
	}
}

async function filterMessages(messages) {
	let users = [];
	messages.forEach((message) => {
		users.push(message.author.id);
	});

	let uniqueUsers = users.filter((element, index) => {
		return users.indexOf(element) === index;
	});
	let result = {};
	for (const user of uniqueUsers) {
		let userMessages = [];
		messages.forEach((message) => {
			if (message.author.id == user) userMessages.push(message.content);
		});
		result[user] = userMessages.join('.');
	}
	return result;
}

async function* messagesIterator(channel) {
	let before = null;
	let done = false;
	let maxPasses = 10;
	let current = 0;
	while (!done) {
		current += 1;
		if (maxPasses < current) {
			done = true;
		}
		const messages = await channel.messages.fetch({ limit: 100, before });
		if (messages.size > 0) {
			before = messages.lastKey();
			yield messages;
		} else done = true;
	}
}

async function* loadAllMessages(channel) {
	for await (const messages of messagesIterator(channel)) {
		for (const message of messages.values()) yield message;
	}
}

module.exports = handleAnalysis;
