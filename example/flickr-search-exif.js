const Flickr = require('flickr-sdk'),
    async = require('async'),
    apikeys = require(__dirname + '/sns-api-keys.json');
const flickr = new Flickr(apikeys.flickr.consumer_key);

flickr.photos.search({
    tags: 'sunset,beach',
    tag_mode: 'all',
    extras: 'tags,url_m'
}).then((resSearch) => {
    let photos = resSearch.body.photos;
    async.mapLimit(photos.photo, 6, (photo, fin) => {
        flickr.photos.getExif({
            photo_id: photo.id
        }).then((resExif) => {
            console.log("\t" + photo.id);
            photo.camera = resExif.body.photo.camera;
            photo.exif = {};
            resExif.body.photo.exif.forEach((item) => {
                photo.exif[item.tag] = item.raw._content;
            });
            fin(null, photo);
        }).catch((error) => {
            console.log("[SKIP]\t", photo.id);
            fin(null, photo);
            //throw error;
        });
    }, (error, photosWithEXIF) => {
        photosWithEXIF.forEach((photo) => {
            if (photo.exif && photo.exif.ExposureTime && photo.exif.FNumber) {
                console.log('ID:  \t' + photo.id);
                console.log('camera:\t' + photo.camera);
                console.log('S:\t' + photo.exif.ExposureTime);
                console.log('A:\t' + hoto.exif.FNumber);
                console.log('URL: \t' + photo.url_m);
                console.log('====');
            }
        });
    });
}).catch((error) => {
    throw error;
});