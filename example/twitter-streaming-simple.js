const Twitter = require('twitter'),
    apikeys = require(__dirname + '/sns-api-keys.json');
const client = new Twitter(apikeys.twitter);

const stream = client.stream('statuses/filter', { track: "なう。" });
stream.on('data', (status) => {
    console.log('ID:  \t' + status.id);
    console.log('Tweet:\t' + status.text);
    console.log("====");
});
stream.on('error', (error) => {
    throw error;
});