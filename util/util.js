const async = require('async');

exports.exif = (exif) => {
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
    if (exif.FocalLengthIn35mmFormat) {
        exif.FocalLengthIn35mmFormat = parseFloat(exif.FocalLengthIn35mmFormat.replace(/[^0-9\.]+$/, ""))
    }
    if (exif.FocalLength) {
        exif.FocalLength = parseFloat(exif.FocalLength.replace(/[^0-9\.]+$/, ""))
    }
    return exif;
};

exports.sobig_filtering = (item, filter, callback) => {
    if (!filter || !Array.isArray(filter) || filter.length == 0) {
        async.setImmediate(callback, null, true);
    } else {
        async.every(filter, (f, cbFilter) => {
            let pass = false;
            let left, op, right;
            op = f[1];
            if (typeof f[0] == "string" && f[0].startsWith('$')) {
                left = item[f[0].substr(1)];
            } else {
                left = f[0];
            }
            if (typeof f[2] == "string" && f[2].startsWith('$')) {
                right = item[f[2].substr(1)];
            } else {
                right = f[2];
            }
            switch (op) {
                case '==':
                    pass = (left == right);
                    break;
                case '<':
                    pass = (left < right);
                    break;
                case '>':
                    pass = (left > right);
                    break;
                case '<=':
                    pass = (left <= right);
                    break;
                case '>=':
                    pass = (left >= right);
                    break;
                default:
                    throw "Illigal Operator";
            }
            cbFilter(null, pass);
        }, (err, pass) => {
            callback(err, pass);
        });
    }
}