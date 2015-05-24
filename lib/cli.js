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
    var scopeTree = scopeManager.acquire(ast);

    function getVariablesInScope(scope, paths) {
        var variables = scope.variables;
        var result = [];
        variables.forEach(function (variable) {
            if (variable.defs.length === 0) {
                return;
            }
            var tag = getTag(variable);
            tag.namespace = paths.join('.');
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

    function getScopeName(scope) {
        if (scope.type === 'global') {
            return scope.type;
        }
        if (scope.block && scope.block.id) {
            return scope.block.id.name;
        }
        return 'Anoymous';
    }

    var tags = [];
    var paths = [];

    function dfs(node) {
        var name = getScopeName(node);
        paths.push(name);
        // variables in this scope
        tags = tags.concat(getVariablesInScope(node, paths));
        node.childScopes.forEach(function (scope) {
            dfs(scope);
        });
        paths.pop();
    }

    dfs(scopeTree);

    console.log(tags);
};
