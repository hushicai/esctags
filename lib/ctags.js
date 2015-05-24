/**
 * @file ctags
 * @author hushicai(bluthcy@gmail.com)
 */

exports.generate = function (tags) {
    var result = tags.map(function (tag) {
        var buf = [tag.name, '\t', tags.filename, '\t'];
        buf.push('/^' + tag.addr + '$/;"');
        buf.push('\t', tag.kind);

        delete tag.name;
        delete tag.filename;
        delete tag.addr;
        delete tag.kind;

        Object.keys(tag).forEach(function (key) {
            buf.push('\t', key, ':', tag[key]);
        });

        buf.push('\n');
        return buf.join('');
    });
    return result.join('');
};
