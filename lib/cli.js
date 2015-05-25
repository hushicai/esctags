/**
 * @file cli
 * @author hushicai(bluthcy@gmail.com)
 */


exports.parse = function (args) {
    var escope = require('escope');
    var esprima = require('esprima');
    var minimist = require('minimist');
    var argv = minimist(args);
    var file = argv._.pop();
    var code = require('fs').readFileSync(file, 'utf-8');
    var ast = esprima.parse(code, {range: true, loc: true});
    var scopeManager = escope.analyze(ast);
    var estraverse = require('estraverse');
    var Syntax = estraverse.Syntax;
    var Type = require('./Type');
    var util = require('./util');

    function getTagsInScope(scope, paths) {
        var variables = scope.variables;
        var result = [];
        variables.forEach(function (variable) {
            if (variable.defs.length === 0) {
                return;
            }
            result = result.concat(
                getTagsFromVariable(variable, paths)
            );
        });
        return result;
    }

    function getTagsFromVariable(variable, paths) {
        var def = variable.defs[0];
        var node = def.node;
        var name = def.name;
        var nodeInit = node.init;
        var variableName = variable.name;
        var type = def.type;

        if (type === 'FunctionName'
            || (nodeInit && nodeInit.type === Syntax.FunctionExpression)
            || (nodeInit && nodeInit.type === Syntax.ObjectExpression)
        ) {
            type = Type.CONTEXT;
        }

        var result = [];
        var tag = getTag({
            name: variableName,
            type: type,
            range: name.range,
            loc: name.loc,
            paths: paths
        });

        result.push(tag);

        return result;
    }

    function getTagsFromObjectExpression(node, paths) {
        var result = [];
        var properties = node.properties;

        function dfs(property) {
            var value = property.value;
            var key = property.key;
            var propertyName = key.name;
            var propertyType = property.type;
            if (value.type === Syntax.ObjectExpression) {
                propertyType = Type.CONTEXT;
                paths.push(propertyName);
                value.properties.forEach(dfs);
                paths.pop();
            }
            else if (value.type === Syntax.FunctionExpression) {
                propertyType = Type.CONTEXT;
            }
            result.push(getTag({
                name: propertyName,
                range: key.range,
                loc: key.loc,
                type: propertyType,
                paths: paths
            }));
        }

        properties.forEach(dfs);

        return result;
    }

    function getTagsFromObjectDeclaratorNode(node, paths) {
        var name = node.id.name;
        paths.push(name);

        return getTagsFromObjectExpression(node.init, paths);
    }

    function getTagsFromMemberAssignmentNode(node,  paths) {
        var result = [];
        var accessPaths = [];

        function getTagsFromLeft(node) {
            var left = node.left;
            util.getMemberExpressionPaths(left, accessPaths);

            var tempPaths = accessPaths.slice(0);

            tempPaths.pop();

            var property = left.property;
            var name = property.name;

            var tag = getTag({
                name: name,
                type: node.right.type === Syntax.ObjectExpression
                    ? Type.CONTEXT
                    : Type.PROPERTY,
                range: property.range,
                loc: property.loc,
                paths: paths.concat(tempPaths)
            });
            result.push(tag);
        }

        function getTagsFromRight(node) {
            var right = node.right;
            if (right.type === Syntax.ObjectExpression) {
                accessPaths = paths.concat(accessPaths);
                var temp = getTagsFromObjectExpression(right, accessPaths);
                result = result.concat(temp);
            }
        }

        getTagsFromLeft(node);
        getTagsFromRight(node);

        return result;
    }

    function getTag(config) {
        var range = config.range;

        config.addr = range.length ? code.slice(range[0], range[1]) : config.name;
        config.line = config.loc.start.line;
        config.filename = require('path').resolve(file);

        delete config.range;
        delete config.loc;

        var Tag = require('./Tag');
        return new Tag(config);
    }

    var tags = [];

    estraverse.traverse(ast, {
        enter: function (node, parent) {
            var paths = util.getPaths(this.parents());
            if (util.isScopeNode(node)) {
                var currentScope = scopeManager.acquire(node);
                var d = util.getScopeName(node, parent);
                var name = d.name;

                // 暂存吧
                node.__name = name;

                // 对于匿名function，先在上一个scope中生成一个tag
                if (d.isAnoymous) {
                    var tag = getTag({
                        name: name,
                        type: Type.CONTEXT,
                        range: [],
                        loc: node.loc,
                        paths: paths
                    });
                    tags.push(tag);
                }

                paths.push(name);

                var tagsInCurrentScope = getTagsInScope(currentScope, paths);
                tags = tags.concat(tagsInCurrentScope);
            }
            else if (util.isMemberAssignmentNode(node)) {
                tags = tags.concat(getTagsFromMemberAssignmentNode(node, paths));
            }
            else if (util.isObjectDeclaratorNode(node)) {
                tags = tags.concat(getTagsFromObjectDeclaratorNode(node, paths));
            }
        },
        leave: function (node, parent) {}
    });

    var result = require('./ctags').generate(tags);

    console.log(result);
};
