const { Configuration, OpenAIApi } = require('openai');
const botcontext = require('../context');
const configuration = new Configuration({
	apiKey: process.env.OPENAI_TOKEN
});

const openai = new OpenAIApi(configuration);

async function handlePrompt(message) {
	let response = await generatePrompt(message.content, message.author);
	if (response) {
		let messageChannel = client.channels.cache.get(message.channelId);
		await messageChannel.sendTyping();
		await delay(parseInt(response.length * 25));
		message.reply(response);
	} else {
		message.reply("Sorry, I cant speak. I don't feel ok right now.");
	}
}

async function generatePrompt(discordMessage, asker) {
	let askerUsername = asker.username.replace(/[^a-zA-Z ]/g, '');
	let user = botcontext.other_users.whois + askerUsername;
	let userBehaviour = botcontext.other_users.user_context;

	if (botcontext.processedContext[asker.id]) {
		user = botcontext.processedContext[asker.id].whois + askerUsername;
		userBehaviour = botcontext.processedContext[asker.id].user_context;
	}

	let prompt = `
${botcontext.about}

Impersonate: ${botcontext.behaviour}

Optional to Impersionate: ${userBehaviour}

${user} said: ${discordMessage}

Your answer in chat:`;

	let errorStatus = 429;
	let retryCounter = 0;
	while (errorStatus == 429 && retryCounter < 4) {
		retryCounter += 1;
		errorStatus = 0;
		try {
			const completion = await openai.createCompletion({
				model: 'text-davinci-003',
				temperature: 0.9,
				max_tokens: 500,
				prompt: prompt
			});

			return completion.data.choices[0].text;
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
module.exports = handlePrompt;
