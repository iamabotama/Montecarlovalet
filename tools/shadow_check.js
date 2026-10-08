/* Finds calls to the translate function t(...) inside a scope where a local variable or parameter named `t`
   hides it (that call would crash or draw the wrong thing). Scope-aware: function params and body
   declarations, block-level let/const, and for-loop bindings. Used by tools/check_i18n.js when acorn is
   installed (CI installs it; locally: npm i --no-save acorn). Returns a list of "file:line". */
'use strict';
function findShadowedT(acorn, src, file) {
  const ast = acorn.parse(src, { ecmaVersion: 2022, locations: true });
  const out = [];
  const declares = list =>
    list.some(
      s =>
        s &&
        s.type === 'VariableDeclaration' &&
        s.declarations.some(d => d.id.type === 'Identifier' && d.id.name === 't'),
    );
  const isFn = n => /Function/.test(n.type);
  const visit = (n, hidden) => {
    if (!n || typeof n.type !== 'string') return;
    if (isFn(n)) {
      hidden =
        hidden ||
        n.params.some(p => p.type === 'Identifier' && p.name === 't') ||
        (n.body.type === 'BlockStatement' && declares(n.body.body));
    } else if (n.type === 'BlockStatement' || n.type === 'Program') hidden = hidden || declares(n.body);
    else if (n.type === 'ForOfStatement' || n.type === 'ForInStatement') hidden = hidden || declares([n.left]);
    else if (n.type === 'ForStatement') hidden = hidden || declares([n.init]);
    if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === 't' && hidden)
      out.push(file + ':' + n.loc.start.line);
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(c => visit(c, hidden));
      else if (v && typeof v.type === 'string') visit(v, hidden);
    }
  };
  visit(ast, false);
  return out;
}
module.exports = { findShadowedT };
