/**
 * @file ctags
 * @author hushicai(bluthcy@gmail.com)
 */

exports.generate = function (tags) {
    tags.sort(function (a, b) {
        if (a.line > b.line) {
            return 1;
        }
        else if (a.line < b.line) {
            return -1;
        }
        return 0;
    });
    var result = [];
    tags.forEach(function (tag) {
        result.push(tag.generate());
    });
    return result.join('');
};
