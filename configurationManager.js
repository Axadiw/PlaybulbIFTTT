"use strict";

var log = require('./logging.js');

var Promise = require('bluebird')
var Candle = require('./candle.js')
var Configuration = require('./configuration.js')
var store = Promise.promisifyAll(require('json-fs-store')('configuration'));
var fs = Promise.promisifyAll(require('fs'));

class ConfigurationManager {
    constructor() {
        this.currentConfiguration = new Configuration()
    }

    load() {
        var thisManager = this;
        return fs.accessAsync(store.dir + "/" + Configuration.DefaultConfigurationId + ".json")
            .then(function (status) {
                return store.loadAsync(Configuration.DefaultConfigurationId)
                    .then(function (configuration) {
                        thisManager.currentConfiguration = configuration

                        for (var key in configuration.candles) {
                            let candle = configuration.candles[key];
                            var newCandle = new Candle()
                            newCandle.configureFromOtherCandle(candle)

                            thisManager.currentConfiguration.candles[candle.id] = newCandle
                        }
                    })

            })
            .catch(function () { })
    }

    save() {
        return store.addAsync(this.currentConfiguration)
    }

    setDefaultColor(color) {
        this.currentConfiguration.defaultColor = color
        return this.save()
    }

    addCandles(candles) {
        for (var candle of candles) {
            this.currentConfiguration.candles[candle.id] = candle
        }

        return this.save()
    }
}

module.exports = ConfigurationManager;