const Flickr = require('flickr-sdk'),
    apikeys = require(__dirname + '/sns-api-keys.json');
const flickr = new Flickr(apikeys.flickr.consumer_key);

flickr.photos.search({
    tags: 'sunset,beach',
    tag_mode: 'all',
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
    console.log('全' + photos.pages + 'ページ中' + photos.page + 'ページ目');
    console.log('全' + photos.total + '枚中' + photos.perpage + '毎表示');
}).catch((error) => {
    throw error;
});