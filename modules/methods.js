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

module.exports.getRandomInt = getRandomInt;
module.exports.delay = delay;
