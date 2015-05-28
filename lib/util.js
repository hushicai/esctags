/**
 * @file util
 * @author hushicai(bluthcy@gmail.com)
 */

var Syntax = require('estraverse').Syntax;

function getMemberExpressionPaths(node, out) {
    if (node.object) {
        getMemberExpressionPaths(node.object, out);
    }
    if (node.property) {
        out.push(node.property.name);
    }
    else if (node.name) {
        out.push(node.name);
    }
}

function isScopeNode(node) {
    var type = node.type;
    return type === Syntax.Program
        || type === Syntax.FunctionDeclaration
        || type === Syntax.FunctionExpression;
}

function isMemberAssignmentNode(node) {
    return node.type === Syntax.AssignmentExpression
        && node.left.type === Syntax.MemberExpression;
}

function isObjectDeclaratorNode(node) {
    return node.type === Syntax.VariableDeclarator
        && node.init
        && node.init.type === Syntax.ObjectExpression;
}

var guid = 0;
function getScopeName(node, parents) {
    var type = node.type;
    var name;
    var isAnoymous;
    var parent = parents[parents.length - 1];

    if (type === Syntax.Program) {
        name = 'global';
    }
    else if (type === Syntax.FunctionDeclaration) {
        name = node.id.name;
    }
    else if (parent.type === Syntax.VariableDeclarator) {
        name = parent.id.name;
    }
    // var x = {y: function () {}};
    // global.x = {y: function () {}};
    else if (parent.type === Syntax.Property) {
        var temp = [];
        var item;
        for (var i = parents.length - 1; i >= 0; i--) {
            item = parents[i];
            if (item.type === Syntax.Property) {
                temp.unshift(item.key.name);
            }
            else if (item.type === Syntax.VariableDeclarator) {
                temp.unshift(item.id.name);
                break;
            }
            else if (isMemberAssignmentNode(item)) {
                var tempPaths = [];
                getMemberExpressionPaths(item.left, tempPaths);
                temp = tempPaths.concat(temp);
                break;
            }
        }
        name = temp.join('::');
    }
    // global.x = function () {};
    else if (isMemberAssignmentNode(parent)) {
        var temp = [];
        getMemberExpressionPaths(parent.left, temp);
        name = temp.join('::');
    }
    else if (type === Syntax.FunctionExpression) {
        name = '__fn_' + (++guid);
        isAnoymous = true;
    }

    return {
        name: name,
        isAnoymous: isAnoymous
    };
}

function getPaths(parents) {
    var paths = [];
    for (var i = parents.length - 1; i >= 0; i--) {
        var node = parents[i];
        var name = node.__name;
        if (name) {
            name = name.split('::');
            paths = name.concat(paths);
        }
    }
    return paths;
}

function removeItemFromPaths(paths, item) {
    return paths.filter(function (v, i) {
        return v !== item;
    });
}

exports.getMemberExpressionPaths = getMemberExpressionPaths;
exports.isScopeNode = isScopeNode;
exports.isMemberAssignmentNode = isMemberAssignmentNode;
exports.isObjectDeclaratorNode = isObjectDeclaratorNode;
exports.getScopeName = getScopeName;
exports.getPaths = getPaths;
exports.removeItemFromPaths = removeItemFromPaths;
