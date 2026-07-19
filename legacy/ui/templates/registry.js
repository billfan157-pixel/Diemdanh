/**
 * Tiny template registry used by index.html.
 * Templates are JS files instead of fetched HTML partials so double-click/file:// still works.
 */
(function (GL) {
  "use strict";

  GL.templates = GL.templates || {};
  GL.templateOrder = GL.templateOrder || [];

  GL.registerTemplate = function registerTemplate(name, markup) {
    if (!GL.templates[name]) GL.templateOrder.push(name);
    GL.templates[name] = markup;
  };
})(window.GL = window.GL || {});
