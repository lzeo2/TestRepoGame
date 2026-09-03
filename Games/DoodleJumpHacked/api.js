"use strict";
// Minimal offline CloudAPI stub — replaces the wanted5games.com cloud API
var CloudAPI = {
    init: function(opts) {
        console.log('[CloudAPI] offline stub init', opts);
    },
    mute: function() { return false; },
    unmute: function() { return false; },
    gameOver: function() { console.log('[CloudAPI] offline gameOver'); },
    scores: {
        submit: function(name, score, cb) { cb && cb(true); },
        fetch: function(cb) { cb && cb([]); },
        list: function() { return false; }
    },
    play: function() { console.log('[CloudAPI] offline play'); },
    links: {
        active: function() { return false; },
        list: function() { return {}; }
    },
    logos: {
        active: function() { return false; },
        list: function() { return {}; }
    },
    info: {
        portal: function() { return 0; }
    }
};
