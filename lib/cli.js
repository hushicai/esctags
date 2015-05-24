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

    function getTagsInScope(scope, paths) {
        var variables = scope.variables;
        var result = [];
        variables.forEach(function (variable) {
            if (variable.defs.length === 0) {
                return;
            }
            var tag = getTag(variable);
            tag.scope = paths.join('::');
            result.push(tag);
        });
        return result;
    }

    function getTag(variable) {
        var tag = {};
        var def = variable.defs[0];
        var range = def.name.range;
        var loc = def.name.loc;

        tag.name = variable.name;
        tag.addr = code.slice(range[0], range[1]);
        tag.line = loc.start.line;
        tag.filename = require('path').normalize(file);
        // 如果是Object Literal

        switch (def.type) {
            case 'Variable':
                tag.kind = 'v';
                break;
            case 'FunctionName':
                tag.kind = 'f';
                break;
            case 'Parameter':
                // arguments
                tag.kind = 'a';
                break;
        }
        return tag;
    }

    var tags = [];
    var paths = [];
    var estraverse = require('estraverse');
    var Syntax = estraverse.Syntax;

    function isScope(node) {
        var type = node.type;
        return type === Syntax.Program
            || type === Syntax.FunctionDeclaration
            || type === Syntax.FunctionExpression;
    }

    estraverse.traverse(ast, {
        enter: function (node, parent) {
            if (isScope(node)) {
                var currentScope = scopeManager.acquire(node);
                var name;
                var type = currentScope.type;

                if (type === 'global') {
                    name = 'global';
                }
                else if (currentScope.block.id) {
                    name = currentScope.block.id.name;
                }
                // @see: http://ecma-international.org/ecma-262/5.1/#sec-13
                // function expression也是匿名函数
                // else if (parent.type === Syntax.VariableDeclarator) {
                    // name = parent.id.name;
                // }
                // else if (parent.type === Syntax.Property) {
                    // name = parent.key.name;
                // }
                else {
                    name = 'Anoymous';
                }
                paths.push(name);
                var tagsInCurrentScope = getTagsInScope(currentScope, paths);
                tags = tags.concat(tagsInCurrentScope);
                if (currentScope.childScopes.length === 0) {
                    paths.pop();
                }
            }
        },
        leave: function (node, parent) {}
    });

    var result = require('./ctags').generate(tags);
    console.log(result);
};
