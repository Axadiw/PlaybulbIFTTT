"use strict";

var Promise = require('bluebird')
var Candle = require('./candle.js')
var log = require('./logging.js');
var rp = require('request-promise');
var store = Promise.promisifyAll(require('json-fs-store')("configuration"));

const NetworkConfigurationId = "networkConfiguration"
var spreadsheetKey = ""
var spreadsheetColorsGID = ""
var refreshDesiredColorInterval = 5000

class NetworkManager {
    constructor() {
        this.turnOnCandlesCallback = function () { }
    }

    load() {
        return store.loadAsync(NetworkConfigurationId)
            .then(function (configuration) {
                spreadsheetKey = configuration.spreadsheetKey
                spreadsheetColorsGID = configuration.spreadsheetColorsGID
            })
    }

    start() {
        var thisManager = this
        setInterval(function () {
            rp("https://docs.google.com/spreadsheets/d/" + spreadsheetKey + "/export?gid=" + spreadsheetColorsGID + "&format=csv")
                .then(function (response) {
                    var turnOnCandles = response == "1"
                    thisManager.turnOnCandlesCallback(turnOnCandles)
                    log.debug('Setting "turn on candles" to ' + turnOnCandles)
                })
                .catch(function (err) {
                    log.error(err)
                });
        }, refreshDesiredColorInterval)
    }
}

module.exports = NetworkManager;