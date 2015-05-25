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

    /**
     * 类型
     *
     * @type {Object}
     */
    var Type = {
        NAMESPACE: 'namespace',
        FUNCTION_NAME: 'FunctionName',
        PARAMETER: 'Parameter',
        VARIABLE: 'Variable',
        PROPERTY: 'Property'
    };

    /**
     * 类别
     *
     * @type {Object}
     */
    var Category = {
        FUNCTION: 'function',
        NAMESPACE: 'namespace'
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
                    loc: name.loc,
                    category: Category.FUNCTION
                }, paths);
                result.push(tag);
                break;
            case Syntax.ObjectExpression:
                result = result.concat(getTagsFromObjectExpression(variable, paths));
                break;
            default:
                tag = getTag({
                    name: variableName,
                    type: def.type,
                    range: name.range,
                    loc: name.loc,
                    category: Category.FUNCTION
                }, paths);
                result.push(tag);
        }
        return result;
    }

    function getTagsFromObjectExpression(variable, paths) {
        var result = [];
        var def = variable.defs[0];
        var node = def.node;
        var name = def.name;
        var nodeInit = node.init;
        var variableName = variable.name;
        var properties = nodeInit.properties;

        result.push(getTag({
            name: variableName,
            range: name.range,
            loc: name.loc,
            type: Type.NAMESPACE,
            category: Category.FUNCTION
        }, paths));

        paths.push(variableName);

        function dfs(property) {
            var value = property.value;
            var key = property.key;
            var propertyName = key.name;
            var propertyType = property.type;
            if (value.type === Syntax.ObjectExpression) {
                propertyType = Type.NAMESPACE;
                paths.push(propertyName);
                value.properties.forEach(dfs);
                paths.pop();
            }
            result.push(getTag({
                name: propertyName,
                range: key.range,
                loc: key.loc,
                type: propertyType,
                category: Category.NAMESPACE
            }, paths));
        }

        properties.forEach(dfs);

        paths.pop();

        return result;
    }

    function getTag(config, paths) {
        var range = config.range;
        var loc = config.loc;
        var name = config.name;
        var type = config.type;
        var category = config.category;

        var tag = {};

        tag.name = name;
        tag.addr = range.length ? code.slice(range[0], range[1]) : name;
        tag.line = loc.start.line;
        tag.filename = require('path').resolve(file);
        var temp = paths.slice(1).join('::');

        switch (type) {
            case Type.VARIABLE:
                tag.kind = 'v';
                break;
            case Type.FUNCTION_NAME:
                tag.kind = 'f';
                break;
            case Type.NAMESPACE:
                tag.kind = 'n';
                break;
            case Type.PARAMETER:
                // arguments
                tag.kind = 'a';
                break;
            case Type.PROPERTY:
                tag.kind = 'p';
                break;
        }
        if (category && temp) {
            tag[category] = temp;
        }
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
                        loc: node.loc,
                        category: Category.FUNCTION
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
