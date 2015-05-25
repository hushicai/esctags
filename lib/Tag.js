/**
 * @file Tag
 * @author hushicai(bluthcy@gmail.com)
 */

var Type = require('./Type');

function Tag(config) {
    var tag = this;

    var type = config.type;
    delete config.type;

    var paths = config.paths;
    var temp = paths.slice(1).join('::');
    delete config.paths;

    for (var key in config) {
        if (config.hasOwnProperty(key)) {
            tag[key] = config[key];
        }
    }

    switch (type) {
        case Type.VARIABLE:
            tag.kind = 'v';
            break;
        case Type.CONTEXT:
            tag.kind = 'c';
            break;
        case Type.PARAMETER:
            // arguments
            tag.kind = 'a';
            break;
        case Type.PROPERTY:
            tag.kind = 'p';
            break;
        case Type.PROTOTYPE:
            tag.kind = 's';
            break;
        default:
            tag.kink = 'c';
    }
    // 一个scope类型有可能是function，也有可能是namespace
    // 为了让tagbar不产生pseudo-tags，还是将它统一成context吧
    if (temp) {
        tag.context = temp;
    }
    return tag;
}

Tag.prototype.generate = function () {
    var tag = this;

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
};

module.exports = Tag;
