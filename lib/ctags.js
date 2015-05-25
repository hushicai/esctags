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
    var result = tags.map(function (tag) {
        var buf = [tag.name, '\t', tag.filename, '\t'];
        buf.push('/^' + tag.addr + '$/;"');
        buf.push('\t', tag.kind);

        delete tag.name;
        delete tag.filename;
        delete tag.addr;
        delete tag.kind;

        Object.keys(tag).forEach(function (key) {
            buf.push('\t', key, ':', tag[key]);
        });

        buf = buf.join('').replace(/\n/g, '\\n') + '\n';
        return buf;
    });
    return result.join('');
};
