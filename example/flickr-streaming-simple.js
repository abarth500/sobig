const Flickr = require('flickr-sdk'),
    CronJob = require('cron').CronJob,
    apikeys = require(__dirname + '/sns-api-keys.json');
const flickr = new Flickr(apikeys.flickr.consumer_key);


new CronJob('*/30 * * * * *', () => {
    flickr.photos.getRecent({
        extras: 'tags,url_m'
    }).then((response) => {
        let photos = response.body.photos;
        photos.photo.forEach((photo) => {
            console.log('ID:  \t' + photo.id);
            console.log('Title:\t' + photo.title);
            console.log('Tags:\t' + photo.tags);
            console.log('URL: \t' + photo.url_m);
            console.log('====');
        });
    }).catch((error) => {
        throw error;
    });
}, null, false, 'Asia/Tokyo');