/**
 * Mount static DOM templates before feature modules bind events.
 */
(function (GL) {
  "use strict";

  var mount = document.getElementById("appMount");
  if (!mount) throw new Error("Missing #appMount");
  if (!GL.templates || !GL.templateOrder || !GL.templateOrder.length) {
    throw new Error("No DOM templates registered");
  }

  mount.innerHTML = GL.templateOrder
    .map(function (name) {
      return GL.templates[name] || "";
    })
    .join("\n");
})(window.GL = window.GL || {});
