async function handleReactions(message) {
	//TODO: Add gpt reaction preprocess
	if (message.author.id == ownerID) {
		const randomNumber = Math.floor(Math.random() * 100);
		if (randomNumber <= 10) {
			await message.react('❤️');
		}
	}
}

module.exports = handleReactions;
