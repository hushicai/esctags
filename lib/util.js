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
function getScopeName(node, parent) {
    var type = node.type;
    var name;
    var isAnoymous;

    if (type === Syntax.Program) {
        name = 'global';
    }
    else if (type === Syntax.FunctionDeclaration) {
        name = node.id.name;
    }
    // @see: http://ecma-international.org/ecma-262/5.1/#sec-13
    // else if (parent.type === Syntax.VariableDeclarator) {
        // name = parent.id.name;
    // }
    // else if (parent.type === Syntax.Property) {
        // name = parent.key.name;
    // }
    // else if (util.isMemberAssignmentNode(parent)) {
        // var temp = [];
        // util.getMemberExpressionPaths(parent.left, temp);
        // temp = removeItemFromPaths(temp, 'prototype');
        // name = temp.join('::');
    // }
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
        if (node.__name) {
            paths.unshift(node.__name);
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