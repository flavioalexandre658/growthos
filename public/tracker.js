(function () {
  "use strict";

  var QUEUE_KEY = "growthos_queue";
  var UTM_KEY = "growthos_utm";
  var SESSION_KEY = "growthos_sid";
  var CHECKOUT_KEY = "growthos_checkout";

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  var API_KEY = script.getAttribute("data-key") || "";
  var scriptSrc = script.getAttribute("src") || "";
  var AUTO_ABANDON = script.getAttribute("data-auto-abandon") !== "false";

  var API_BASE = (function () {
    try {
      var url = new URL(scriptSrc);
      return url.origin;
    } catch (_) {
      return "";
    }
  })();

  function generateId() {
    return "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx".replace(/x/g, function () {
      return Math.floor(Math.random() * 16).toString(16);
    });
  }

  function getSessionId() {
    try {
      var sid = sessionStorage.getItem(SESSION_KEY);
      if (!sid) {
        sid = "s_" + generateId();
        sessionStorage.setItem(SESSION_KEY, sid);
      }
      return sid;
    } catch (_) {
      return "s_" + generateId();
    }
  }

  var SOURCE_PATTERNS = [
    { pattern: /google/i, source: "google" },
    { pattern: /bing/i, source: "bing" },
    { pattern: /yahoo/i, source: "yahoo" },
    { pattern: /duckduckgo/i, source: "duckduckgo" },
    { pattern: /instagram/i, source: "instagram" },
    { pattern: /facebook|fb\.com/i, source: "facebook" },
    { pattern: /twitter|t\.co/i, source: "twitter" },
    { pattern: /linkedin/i, source: "linkedin" },
    { pattern: /tiktok/i, source: "tiktok" },
    { pattern: /youtube/i, source: "youtube" },
    { pattern: /whatsapp/i, source: "whatsapp" },
    { pattern: /telegram/i, source: "telegram" },
    { pattern: /email|mail\./i, source: "email" },
  ];

  function inferSourceFromReferrer(referrer) {
    if (!referrer) return "direct";
    for (var i = 0; i < SOURCE_PATTERNS.length; i++) {
      if (SOURCE_PATTERNS[i].pattern.test(referrer)) {
        return SOURCE_PATTERNS[i].source;
      }
    }
    try {
      return new URL(referrer).hostname.replace("www.", "");
    } catch (_) {
      return "referral";
    }
  }

  function persistUtms() {
    try {
      var params = new URLSearchParams(window.location.search);
      var utmSource = params.get("utm_source");
      if (utmSource) {
        var utms = {
          source: utmSource,
          medium: params.get("utm_medium") || "cpc",
          campaign: params.get("utm_campaign") || null,
          content: params.get("utm_content") || null,
          term: params.get("utm_term") || null,
        };
        sessionStorage.setItem(UTM_KEY, JSON.stringify(utms));
      }
    } catch (_) {}
  }

  function getStoredUtms() {
    try {
      var stored = sessionStorage.getItem(UTM_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  }

  function getAutoContext() {
    var params = new URLSearchParams(window.location.search);
    var storedUtms = getStoredUtms();
    var referrer = document.referrer || null;

    var source = params.get("utm_source") ||
      (storedUtms && storedUtms.source) ||
      inferSourceFromReferrer(referrer);

    var medium = params.get("utm_medium") ||
      (storedUtms && storedUtms.medium) ||
      (referrer ? "referral" : "direct");

    var campaign = params.get("utm_campaign") ||
      (storedUtms && storedUtms.campaign) ||
      null;

    var content = params.get("utm_content") ||
      (storedUtms && storedUtms.content) ||
      null;

    var device = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
      ? "mobile"
      : "desktop";

    return {
      source: source,
      medium: medium,
      campaign: campaign,
      content: content,
      landing_page: window.location.pathname,
      referrer: referrer,
      device: device,
      session_id: getSessionId(),
    };
  }

  function readQueue() {
    try {
      var raw = localStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function writeQueue(queue) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-50)));
    } catch (_) {}
  }

  function sendPayload(payload) {
    var url = API_BASE + "/api/track";
    var body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      var blob = new Blob([body], { type: "application/json" });
      var sent = navigator.sendBeacon(url, blob);
      if (sent) return Promise.resolve();
    }

    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body,
      keepalive: true,
    }).catch(function () {});
  }

  function flushQueue() {
    var queue = readQueue();
    if (queue.length === 0) return;
    var batch = queue.slice();
    writeQueue([]);
    batch.forEach(function (item) {
      sendPayload(item).catch(function () {
        var q = readQueue();
        q.unshift(item);
        writeQueue(q);
      });
    });
  }

  function saveCheckout(data) {
    try {
      sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  function clearCheckout() {
    try {
      sessionStorage.removeItem(CHECKOUT_KEY);
    } catch (_) {}
  }

  function getCheckout() {
    try {
      var raw = sessionStorage.getItem(CHECKOUT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function sendBeaconSync(payload) {
    if (!navigator.sendBeacon) return;
    var url = API_BASE + "/api/track";
    var blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    navigator.sendBeacon(url, blob);
  }

  function track(eventType, data) {
    var autoCtx = getAutoContext();
    var payload = Object.assign({}, autoCtx, data || {}, {
      key: API_KEY,
      event_type: eventType,
      timestamp: new Date().toISOString(),
    });

    if (eventType === "checkout_started") {
      saveCheckout(Object.assign({}, data || {}));
    }

    if (eventType === "payment") {
      clearCheckout();
    }

    sendPayload(payload).catch(function () {
      var queue = readQueue();
      queue.push(payload);
      writeQueue(queue);
    });
  }

  function setupCheckoutAbandon() {
    if (!AUTO_ABANDON) return;

    window.addEventListener("beforeunload", function () {
      var checkout = getCheckout();
      if (!checkout) return;

      var autoCtx = getAutoContext();
      var payload = Object.assign({}, autoCtx, checkout, {
        key: API_KEY,
        event_type: "checkout_abandoned",
        reason: "exit",
        timestamp: new Date().toISOString(),
      });

      clearCheckout();
      sendBeaconSync(payload);
    });
  }

  function setupDataAttrTracking() {
    document.addEventListener("click", function (e) {
      var el = e.target;
      while (el && el !== document.body) {
        var eventType = el.getAttribute && el.getAttribute("data-growthos");
        if (eventType) {
          var data = {};
          var attrs = el.attributes;
          for (var i = 0; i < attrs.length; i++) {
            var attr = attrs[i];
            if (attr.name.indexOf("data-growthos-") === 0) {
              var key = attr.name.replace("data-growthos-", "").replace(/-/g, "_");
              var val = attr.value;
              var num = parseFloat(val);
              data[key] = isNaN(num) ? val : num;
            }
          }
          track(eventType, data);
          break;
        }
        el = el.parentElement;
      }
    });
  }

  function setupSpaTracking() {
    var lastPath = window.location.pathname;
    var origPushState = history.pushState.bind(history);
    var origReplaceState = history.replaceState.bind(history);

    function onNavigate() {
      var newPath = window.location.pathname;
      if (newPath !== lastPath) {
        lastPath = newPath;
        track("pageview", {});
      }
    }

    history.pushState = function () {
      origPushState.apply(history, arguments);
      onNavigate();
    };

    history.replaceState = function () {
      origReplaceState.apply(history, arguments);
      onNavigate();
    };

    window.addEventListener("popstate", onNavigate);
  }

  persistUtms();

  flushQueue();

  window.addEventListener("load", function () {
    track("pageview", {});
    setupDataAttrTracking();
    setupSpaTracking();
    setupCheckoutAbandon();
  });

  window.GrowthOS = {
    track: track,
  };
})();
