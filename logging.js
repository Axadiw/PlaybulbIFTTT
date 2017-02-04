"use strict";

require('console-stamp')(console, { pattern: '[dd/mm/yyyy HH:MM:ss.l]'});
var log = require('loglevel');
log.setLevel("info")

module.exports = log;
