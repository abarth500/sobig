const Twitter = require('twitter'),
    apikeys = require(__dirname + '/sns-api-keys.json');
const client = new Twitter(apikeys.twitter);

client.get('search/tweets', { q: 'なう。' })
    .then((tweets) => {
        tweets.statuses.forEach((status) => {
            console.log('ID:  \t' + status.id);
            console.log('Tweet:\t' + status.text);
            console.log('=====');
        })
    })
    .catch((error) => {
        throw error;
    });