const Flickr = require('flickr-sdk'),
    CronJob = require('cron').CronJob,
    apikeys = require(__dirname + '/sns-api-keys.json');
const flickr = new Flickr(apikeys.flickr.consumer_key);

let lastID = 0;
new CronJob('*/30 * * * * *', () => {
    flickr.photos.getRecent({
        extras: 'tags,url_m'
    }).then((response) => {
        let photos = response.body.photos;
        photos.photo.forEach((photo) => {
            if (lastID < parseInt(photo.id)) {
                console.log('ID:  \t' + photo.id);
                console.log('Title:\t' + photo.title);
                console.log('Tags:\t' + photo.tags);
                console.log('URL: \t' + photo.url_m);
                console.log('====');
                lastID = parseInt(photo.id);
            }
        });
    }).catch((error) => {
        throw error;
    });
}, null, true, 'Asia/Tokyo');