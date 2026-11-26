// Original site script (3kh0 fork) credit: echo-the-coder — echo-the-coder@tuta.io, discord: 3kh0_#1791
// The tab-cloak and script-injection routines (Google Analytics, DMCA badge)
// were removed for offline-first hosting; the game itself runs from the local
// UnityLoader.js / webgl.* files and does not depend on this script.

// This Unity 5 export has no JavaScript option for its hardware survey.
// Give just its two optional report endpoints an empty in-memory reply.
(function () {
    var open = XMLHttpRequest.prototype.open;
    var hardwareReport = /^https:\/\/stats\.unity3d\.com\/HWStats(?:Update)?\.cgi(?:[?#]|$)/i;
    XMLHttpRequest.prototype.open = function (method, url) {
        if (method === "POST" && typeof url === "string" && hardwareReport.test(url)) {
            arguments[0] = "GET";
            arguments[1] = "data:application/octet-stream;base64,";
        }
        return open.apply(this, arguments);
    };
})();
