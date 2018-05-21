exports.exif = function(exif) {
    if (exif.ExposureTime) {
        let n = exif.ExposureTime.split('/');
        if (n.length == 2) {
            exif.ExposureTime = parseInt(n[0]) / parseInt(n[1])
        } else if (n.length == 1) {
            exif.ExposureTime = parseInt(exif.ExposureTime);
        } else {
            throw new RangeError();
        }
    }
    if (exif.FNumber) {
        exif.FNumber = parseFloat(exif.FNumber);
    }
    if (exif.ISO) {
        exif.ISO = parseInt(exif.ISO);
    }
    return exif;
};