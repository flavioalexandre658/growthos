(function () {
  "use strict";

  var BOT_PATTERN =
    /bot|crawler|spider|headless|curl|python|wget|scrapy|puppeteer|playwright|selenium|phantomjs|slurp|mediapartners|facebookexternalhit|bingpreview|googlebot|yandexbot|baiduspider|duckduckbot|applebot|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|cohere-ai|ia_archiver|archive\.org_bot|screaming.frog|linkchecker|sitebulb|netcraftsurvey|httpx|go-http-client|java\/|okhttp|axios|node-fetch|undici|postman|insomnia|ahrefsbot|rogerbot|twitterbot|linkedinbot|embedly|quora.link|outbrain|pinterest|slack|vkshare|whatsapp|flipboard|tumblr|nuzzel|discourse|telegrambot|w3c_validator|feedfetcher|netsystemsresearch|seznambot|sogou|exabot|konqueror|megaindex|grapeshot|proximic|blexbot|yeti|admantx|turnitin|grammarly|funnelback|centurybot|bubing|httrack|ltx71|panscient|ccbot|amazonbot|imagesiftbot|dataforseo/i;

  function isBot() {
    try {
      var ua = navigator.userAgent || "";
      if (!ua || ua.length < 15) return true;
      if (BOT_PATTERN.test(ua)) return true;
      if (navigator.webdriver === true) return true;
      return false;
    } catch (_) {
      return false;
    }
  }

  if (isBot()) return;

  var _stub = window.Groware;
  var _preloadQueue = (_stub && _stub._q) ? _stub._q : [];

  var QUEUE_KEY = "groware_queue";
  var UTM_KEY = "groware_utm";
  var SESSION_KEY = "groware_sid";
  var CHECKOUT_KEY = "groware_checkout";
  var DEDUP_KEY = "groware_dedup";
  var DEDUP_TTL_MS = 24 * 60 * 60 * 1000;
  var DEDUP_TTL_FINANCIAL_MS = 365 * 24 * 60 * 60 * 1000;
  var OPT_OUT_KEY = "groware_opt_out";
  var CUSTOMER_KEY = "groware_customer";
  var FINANCIAL_EVENT_TYPES = [
    "payment",
    "refund",
    "renewal",
    "signup",
    "trial_started",
    "subscription_canceled",
    "subscription_changed",
  ];
  var ENTRY_KEY = "groware_entry";
  var FAILED_KEY = "groware_failed_events";
  var FAILED_MAX = 50;
  var FAILED_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  var FAILED_MAX_ATTEMPTS = 3;

  var currentCustomer = null;

  var script =
    document.currentScript ||
    (function () {
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

  function getDedup() {
    try {
      var raw = localStorage.getItem(DEDUP_KEY);
      if (!raw) return [];
      var entries = JSON.parse(raw);
      var now = Date.now();
      var valid = [];
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].e > now) valid.push(entries[i]);
      }
      if (valid.length !== entries.length) {
        localStorage.setItem(DEDUP_KEY, JSON.stringify(valid));
      }
      return valid;
    } catch (_) {
      return [];
    }
  }

  function isDuplicate(key) {
    var set = getDedup();
    for (var i = 0; i < set.length; i++) {
      if (set[i].k === key) return true;
    }
    return false;
  }

  function markDedup(key, eventType) {
    try {
      var set = getDedup();
      var isFinancial = FINANCIAL_EVENT_TYPES.indexOf(eventType) >= 0;
      var ttl = isFinancial ? DEDUP_TTL_FINANCIAL_MS : DEDUP_TTL_MS;
      set.push({ k: key, e: Date.now() + ttl });
      if (set.length > 200) set = set.slice(-200);
      localStorage.setItem(DEDUP_KEY, JSON.stringify(set));
    } catch (_) {}
  }

  function clearDedup() {
    try {
      localStorage.removeItem(DEDUP_KEY);
    } catch (_) {}
  }

  var SEARCH_ENGINES = [
    "google",
    "bing",
    "yahoo",
    "duckduckgo",
    "baidu",
    "yandex",
    "ecosia",
    "chatgpt",
    "perplexity",
    "gemini",
    "claude",
    "copilot",
  ];

  var SOURCE_PATTERNS = [
    { pattern: /gemini\.google/i, source: "gemini" },
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
    { pattern: /pinterest/i, source: "pinterest" },
    { pattern: /baidu/i, source: "baidu" },
    { pattern: /yandex/i, source: "yandex" },
    { pattern: /ecosia/i, source: "ecosia" },
    { pattern: /chat\.openai|chatgpt/i, source: "chatgpt" },
    { pattern: /perplexity/i, source: "perplexity" },
    { pattern: /claude\.ai/i, source: "claude" },
    { pattern: /copilot\.microsoft/i, source: "copilot" },
  ];

  function isSameSite(referrer) {
    if (!referrer) return false;
    try {
      var refHost = new URL(referrer).hostname.replace("www.", "");
      var curHost = window.location.hostname.replace("www.", "");
      return refHost === curHost;
    } catch (_) {
      return false;
    }
  }

  function inferSourceFromReferrer(referrer) {
    if (!referrer || isSameSite(referrer)) return "direct";
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

  function inferMediumFromReferrer(referrer) {
    if (!referrer || isSameSite(referrer)) return "direct";
    var source = inferSourceFromReferrer(referrer);
    for (var i = 0; i < SEARCH_ENGINES.length; i++) {
      if (source === SEARCH_ENGINES[i]) return "organic";
    }
    return "referral";
  }

  var CLICK_ID_MAP = [
    { param: "gclid", source: "google", medium: "cpc" },
    { param: "gbraid", source: "google", medium: "cpc" },
    { param: "wbraid", source: "google", medium: "cpc" },
    { param: "fbclid", source: "facebook", medium: "paid_social" },
    { param: "msclkid", source: "bing", medium: "cpc" },
    { param: "ttclid", source: "tiktok", medium: "paid_social" },
    { param: "twclid", source: "twitter", medium: "paid_social" },
    { param: "li_fat_id", source: "linkedin", medium: "paid_social" },
    { param: "ScCid", source: "snapchat", medium: "paid_social" },
    { param: "pclid", source: "pinterest", medium: "paid_social" },
  ];

  function detectClickId(params) {
    for (var i = 0; i < CLICK_ID_MAP.length; i++) {
      if (params.get(CLICK_ID_MAP[i].param)) {
        return CLICK_ID_MAP[i];
      }
    }
    return null;
  }

  function persistUtms() {
    try {
      var params = new URLSearchParams(window.location.search);
      var clickId = detectClickId(params);
      var utmSource = params.get("utm_source");

      if (clickId) {
        var utms = {
          source: utmSource || clickId.source,
          medium: params.get("utm_medium") || clickId.medium,
          campaign: params.get("utm_campaign") || null,
          content: params.get("utm_content") || null,
          term: params.get("utm_term") || null,
        };
        sessionStorage.setItem(UTM_KEY, JSON.stringify(utms));
        return;
      }

      if (utmSource) {
        var utms = {
          source: utmSource,
          medium: params.get("utm_medium") || "cpc",
          campaign: params.get("utm_campaign") || null,
          content: params.get("utm_content") || null,
          term: params.get("utm_term") || null,
        };
        sessionStorage.setItem(UTM_KEY, JSON.stringify(utms));
        return;
      }

      var existing = sessionStorage.getItem(UTM_KEY);
      if (existing) return;

      var referrer = document.referrer || null;
      if (referrer && !isSameSite(referrer)) {
        var source = inferSourceFromReferrer(referrer);
        var medium = inferMediumFromReferrer(referrer);
        if (source !== "direct") {
          sessionStorage.setItem(
            UTM_KEY,
            JSON.stringify({
              source: source,
              medium: medium,
              campaign: null,
              content: null,
              term: null,
            }),
          );
        }
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

  function getEntryPage() {
    try {
      var stored = sessionStorage.getItem(ENTRY_KEY);
      if (stored) return stored;
      var entry = window.location.pathname;
      sessionStorage.setItem(ENTRY_KEY, entry);
      return entry;
    } catch (_) {
      return window.location.pathname;
    }
  }

  function getStoredCustomer() {
    if (currentCustomer) return currentCustomer;
    try {
      var raw = sessionStorage.getItem(CUSTOMER_KEY);
      if (raw) {
        currentCustomer = JSON.parse(raw);
        return currentCustomer;
      }
    } catch (_) {}
    try {
      var lsRaw = localStorage.getItem(CUSTOMER_KEY);
      if (lsRaw) {
        var parsed = JSON.parse(lsRaw);
        if (parsed._ts && Date.now() - parsed._ts < 2592000000) {
          currentCustomer = parsed;
          return currentCustomer;
        }
        localStorage.removeItem(CUSTOMER_KEY);
      }
    } catch (_) {}
    return null;
  }

  function getAutoContext() {
    var params = new URLSearchParams(window.location.search);
    var storedUtms = getStoredUtms();
    var rawReferrer = document.referrer || null;
    var externalReferrer =
      rawReferrer && !isSameSite(rawReferrer) ? rawReferrer : null;
    var clickId = detectClickId(params);

    var source =
      params.get("utm_source") ||
      (clickId && clickId.source) ||
      (storedUtms && storedUtms.source) ||
      inferSourceFromReferrer(externalReferrer);

    var medium =
      params.get("utm_medium") ||
      (clickId && clickId.medium) ||
      (storedUtms && storedUtms.medium) ||
      inferMediumFromReferrer(externalReferrer);

    var campaign =
      params.get("utm_campaign") || (storedUtms && storedUtms.campaign) || null;

    var content =
      params.get("utm_content") || (storedUtms && storedUtms.content) || null;

    var device =
      /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      )
        ? "mobile"
        : "desktop";

    var customerCtx = getStoredCustomer();

    var ctx = {
      source: source,
      medium: medium,
      campaign: campaign,
      content: content,
      landing_page: window.location.pathname,
      entry_page: getEntryPage(),
      referrer: rawReferrer,
      device: device,
      session_id: getSessionId(),
    };

    if (customerCtx) {
      if (customerCtx.customer_id) ctx.customer_id = customerCtx.customer_id;
      if (customerCtx.customer_name) ctx.customer_name = customerCtx.customer_name;
      if (customerCtx.customer_email) ctx.customer_email = customerCtx.customer_email;
      if (customerCtx.customer_phone) ctx.customer_phone = customerCtx.customer_phone;
    }

    return ctx;
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

  function readFailed() {
    try {
      var raw = localStorage.getItem(FAILED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function writeFailed(list) {
    try {
      localStorage.setItem(FAILED_KEY, JSON.stringify(list.slice(-FAILED_MAX)));
    } catch (_) {}
  }

  function normalizeFailedEntry(entry) {
    var failedAt =
      typeof entry.failedAt === "string"
        ? new Date(entry.failedAt).getTime()
        : entry.failedAt || 0;
    var attempts = typeof entry.attempts === "number" ? entry.attempts : 0;
    return {
      payload: entry.payload,
      reason: entry.reason || "unknown",
      failedAt: failedAt,
      attempts: attempts,
    };
  }

  function logFailedEvent(payload, reason) {
    var list = readFailed();
    list.push({
      payload: payload,
      reason: reason,
      failedAt: Date.now(),
      attempts: 0,
    });
    writeFailed(list);
  }

  function logFailedRetry(entry, reason) {
    var list = readFailed();
    list.push({
      payload: entry.payload,
      reason: reason,
      failedAt: entry.failedAt,
      attempts: entry.attempts + 1,
    });
    writeFailed(list);
  }

  function retryFailedEvents() {
    var raw = readFailed();
    if (raw.length === 0) return;

    var now = Date.now();
    var eligible = [];
    var discarded = [];

    for (var i = 0; i < raw.length; i++) {
      var entry = normalizeFailedEntry(raw[i]);
      var age = now - entry.failedAt;
      if (age > FAILED_TTL_MS || entry.attempts >= FAILED_MAX_ATTEMPTS) {
        discarded.push(entry);
      } else {
        eligible.push(entry);
      }
    }

    writeFailed([]);

    eligible.forEach(function (entry) {
      var retryPayload = Object.assign({}, entry.payload, {
        _retried: true,
        _retry_attempt: entry.attempts + 1,
      });

      fetch(API_BASE + "/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(retryPayload),
        keepalive: true,
      })
        .then(function (res) {
          if (!res.ok && res.status !== 429)
            logFailedRetry(entry, "http_" + res.status);
        })
        .catch(function () {
          logFailedRetry(entry, "network");
        });
    });
  }

  function sendPayload(payload) {
    var url = API_BASE + "/api/track";

    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then(function (res) {
        if (!res.ok && res.status !== 429) {
          logFailedEvent(payload, "http_" + res.status);
        }
      })
      .catch(function () {
        logFailedEvent(payload, "network");
      });
  }

  function flushQueue() {
    var queue = readQueue();
    if (queue.length === 0) return;
    var batch = queue.slice();
    writeQueue([]);
    batch.forEach(function (item) {
      sendPayload(item);
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
    var blob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });
    navigator.sendBeacon(url, blob);
  }

  function track(eventType, data) {
    try {
      if (localStorage.getItem(OPT_OUT_KEY) === "1") return;
    } catch (_) {}

    var rawData = data || {};
    var dedupeOption = rawData.dedupe;
    var serverDedupeId = null;

    if (dedupeOption !== undefined) {
      var dedupKey =
        dedupeOption === true
          ? eventType
          : eventType + ":" + String(dedupeOption);
      if (isDuplicate(dedupKey)) return;
      markDedup(dedupKey, eventType);
      if (dedupeOption !== true) {
        serverDedupeId = eventType + ":" + String(dedupeOption);
      }
    }

    var cleanData = Object.assign({}, rawData);
    delete cleanData.dedupe;

    var autoCtx = getAutoContext();
    var payload = Object.assign({}, autoCtx, cleanData, {
      key: API_KEY,
      event_type: eventType,
      timestamp: new Date().toISOString(),
    });

    if (serverDedupeId) {
      payload.dedupe_id = serverDedupeId;
    }

    if (eventType === "checkout_started") {
      saveCheckout(Object.assign({}, cleanData));
    }

    if (eventType === "payment") {
      clearCheckout();
    }

    sendPayload(payload);
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
        dedupe_id: "checkout_abandoned:" + autoCtx.session_id,
      });

      clearCheckout();
      logFailedEvent(payload, "beacon_backup");
      sendBeaconSync(payload);
    });
  }

  function setupDataAttrTracking() {
    document.addEventListener("click", function (e) {
      var el = e.target;
      while (el && el !== document.body) {
        var eventType = el.getAttribute && el.getAttribute("data-groware");
        if (eventType) {
          var data = {};
          var attrs = el.attributes;
          for (var i = 0; i < attrs.length; i++) {
            var attr = attrs[i];
            if (attr.name.indexOf("data-groware-") === 0) {
              var key = attr.name
                .replace("data-groware-", "")
                .replace(/-/g, "_");
              var val = attr.value;
              if (key === "dedupe") {
                data.dedupe = val === "true" ? true : val;
              } else {
                var num = parseFloat(val);
                data[key] = isNaN(num) ? val : num;
              }
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

  var identifyFn = function (customerId, traits) {
    try {
      var data = traits || {};
      var customer = {
        customer_id: customerId || null,
        customer_name: data.name || null,
        customer_email: data.email || null,
        customer_phone: data.phone || null,
        _ts: Date.now(),
      };
      currentCustomer = customer;
      try { sessionStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer)); } catch (_) {}
      try { localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer)); } catch (_) {}
      track("identify", {
        customer_id: customerId,
        customer_name: data.name || null,
        customer_email: data.email || null,
        customer_phone: data.phone || null,
      });
    } catch (_) {}
  };

  var resetFn = function () {
    try {
      currentCustomer = null;
      try { sessionStorage.removeItem(CUSTOMER_KEY); } catch (_) {}
      try { localStorage.removeItem(CUSTOMER_KEY); } catch (_) {}
    } catch (_) {}
  };

  var _i, _cmd;
  for (_i = 0; _i < _preloadQueue.length; _i++) {
    _cmd = _preloadQueue[_i];
    if (_cmd[0] === "identify") identifyFn(_cmd[1], _cmd[2]);
    else if (_cmd[0] === "reset") resetFn();
  }
  for (_i = 0; _i < _preloadQueue.length; _i++) {
    _cmd = _preloadQueue[_i];
    if (_cmd[0] === "track") track(_cmd[1], _cmd[2]);
  }

  window.Groware = {
    track: track,
    identify: identifyFn,
    reset: resetFn,
    clearDedupe: clearDedup,
    failedEvents: function () {
      return readFailed();
    },
    clearFailedEvents: function () {
      writeFailed([]);
    },
  };

  persistUtms();

  flushQueue();
  retryFailedEvents();

  function init() {
    track("pageview", {});
    setupDataAttrTracking();
    setupSpaTracking();
    setupCheckoutAbandon();
  }

  if (document.readyState === "complete") {
    init();
  } else {
    window.addEventListener("load", init);
  }
})();
