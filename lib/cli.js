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

    var Type = {
        FUNCTION_NAME: 'FunctionName',
        PARAMETER: 'Parameter',
        VARIABLE: 'Variable',
        PROPERTY: 'Property'
    };

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
        var nodeInit = node.init || {};
        var variableName = variable.name;

        var result = [];
        var tag;

        switch (nodeInit.type) {
            case Syntax.FunctionExpression:
                tag = getTag({
                    name: variableName,
                    type: Type.FUNCTION_NAME,
                    range: name.range,
                    loc: name.loc
                }, paths);
                result.push(tag);
                break;
            case Syntax.ObjectExpression:
                // var properties = nodeInit.properties;
                // paths.push(variableName);
                // properties.forEach(function (property) {
                    // var propertyName = property.key.name;
                    // tag = getTag({
                        // name: propertyName,
                        // type: property.type,
                        // range: property.range,
                        // loc: property.loc
                    // }, paths);
                    // result.push(tag);
                // });
                // paths.pop();
                // break;
            default:
                tag = getTag({
                    name: variableName,
                    type: def.type,
                    range: name.range,
                    loc: name.loc
                }, paths);
                result.push(tag);
        }
        return result;
    }

    function getTag(config, paths) {
        var range = config.range;
        var loc = config.loc;
        var name = config.name;
        var type = config.type;

        var tag = {};

        tag.name = name;
        tag.addr = range.length ? code.slice(range[0], range[1]) : name;
        tag.line = loc.start.line;
        tag.filename = require('path').normalize(file);

        switch (type) {
            case Type.VARIABLE:
                tag.kind = 'v';
                break;
            case Type.FUNCTION_NAME:
                tag.kind = 'f';
                break;
            case Type.PARAMETER:
                // arguments
                tag.kind = 'a';
                break;
            case Type.PROPERTY:
                tag.kind = 'p';
                break;
        }
        tag.function = paths.join('::');
        return tag;
    }

    function isScope(node) {
        var type = node.type;
        return type === Syntax.Program
            || type === Syntax.FunctionDeclaration
            || type === Syntax.FunctionExpression;
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

    var guid = 0;
    function getScopeName(node, parent) {
        var type = node.type;
        var name;
        var isAnoymous;

        if (type === Syntax.Program) {
            name = 'global';
        }
        else if (node.id) {
            name = node.id.name;
        }
        // @see: http://ecma-international.org/ecma-262/5.1/#sec-13
        else if (parent.type === Syntax.VariableDeclarator) {
            name = parent.id.name;
        }
        else if (parent.type === Syntax.Property) {
            name = parent.key.name;
        }
        else {
            name = '__fn_' + (++guid);
            isAnoymous = true;
        }
        return {
            name: name,
            isAnoymous: isAnoymous
        };
    }

    var tags = [];

    estraverse.traverse(ast, {
        enter: function (node, parent) {
            if (isScope(node)) {
                var currentScope = scopeManager.acquire(node);
                var d = getScopeName(node, parent);
                var name = d.name;

                // 暂存吧
                node.__name = name;

                var paths = getPaths(this.parents());

                // 对于匿名function，先在上一个scope中生成一个tag
                if (d.isAnoymous) {
                    var tag = getTag({
                        name: name,
                        type: Type.FUNCTION_NAME,
                        range: [],
                        loc: node.loc
                    }, paths);
                    tags.push(tag);
                }

                paths.push(name);

                var tagsInCurrentScope = getTagsInScope(currentScope, paths);
                tags = tags.concat(tagsInCurrentScope);
            }
        },
        leave: function (node, parent) {}
    });

    var result = require('./ctags').generate(tags);
    console.log(result);
};
