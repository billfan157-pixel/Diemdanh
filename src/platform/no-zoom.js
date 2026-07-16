/**
 * Khóa zoom trên mobile (iOS Safari / Chrome / Android).
 * iOS 10+ bỏ qua user-scalable=no — phải chặn bằng JS + touch-action.
 */
(function () {
  "use strict";

  var VIEWPORT =
    "width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, shrink-to-fit=no";

  function lockMeta() {
    var m = document.querySelector('meta[name="viewport"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "viewport");
      document.head.appendChild(m);
    }
    m.setAttribute("content", VIEWPORT);
  }

  lockMeta();

  // Giữ meta không bị script khác / autofill đổi
  try {
    var obs = new MutationObserver(function () {
      var m = document.querySelector('meta[name="viewport"]');
      if (m && m.getAttribute("content") !== VIEWPORT) lockMeta();
    });
    if (document.head) {
      obs.observe(document.head, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ["content"],
      });
    }
  } catch (e) {
    /* ignore */
  }

  var opts = { capture: true, passive: false };

  function prevent(e) {
    e.preventDefault();
  }

  // iOS Safari pinch gesture
  ["gesturestart", "gesturechange", "gestureend"].forEach(function (type) {
    document.addEventListener(type, prevent, opts);
    window.addEventListener(type, prevent, opts);
  });

  // Pinch / multi-touch
  document.addEventListener(
    "touchstart",
    function (e) {
      if (e.touches && e.touches.length > 1) prevent(e);
    },
    opts
  );
  document.addEventListener(
    "touchmove",
    function (e) {
      if (e.touches && e.touches.length > 1) {
        prevent(e);
        return;
      }
      // iOS: event.scale có trên một số bản
      if (typeof e.scale === "number" && e.scale !== 1) prevent(e);
    },
    opts
  );

  // Double-tap zoom — chặn tap thứ 2 trong 200ms trên các phần tử phi tương tác
  var lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    function (e) {
      var now = Date.now();
      if (now - lastTouchEnd <= 200) {
        var target = e.target;
        var isInteractive = target && target.closest && target.closest('button, input, select, textarea, a, [role="button"], .view-btn, .chip, .class-item, .m-nav-item, .m-topbar-btn');
        if (!isInteractive) {
          prevent(e);
        }
      }
      lastTouchEnd = now;
    },
    opts
  );

  // Desktop trackpad pinch
  document.addEventListener(
    "wheel",
    function (e) {
      if (e.ctrlKey) prevent(e);
    },
    opts
  );

  document.addEventListener(
    "dblclick",
    function (e) {
      prevent(e);
    },
    opts
  );

  // Nếu visualViewport bị scale (hiếm) — cố gắng kéo scroll về 0
  function resetVisualViewport() {
    try {
      if (!window.visualViewport) return;
      if (window.visualViewport.scale && window.visualViewport.scale !== 1) {
        lockMeta();
        window.scrollTo(0, 0);
      }
    } catch (err) {
      /* ignore */
    }
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resetVisualViewport);
    window.visualViewport.addEventListener("scroll", resetVisualViewport);
  }
  window.addEventListener("orientationchange", function () {
    setTimeout(lockMeta, 100);
    setTimeout(lockMeta, 400);
  });
})();
