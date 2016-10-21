"use strict";

var Baby = require('babyparse')
var Promise = require('bluebird')
var fs = Promise.promisifyAll(require('fs'))

const BatteryLogFilename = "battery.csv"

module.exports = {
    promiseWhile: function (predicate, action) {
        function loop() {
            if (predicate) return;
            return Promise.resolve(action()).then(loop);
        }
        return Promise.resolve().then(loop);
    },

    sortCandlesDict: function (candles) {
        var sortedCandles = []

        for (var key in candles) {
            let candle = candles[key];
            sortedCandles.push(candle)
        }

        sortedCandles = sortedCandles.sort(function (a, b) {
            var nameA = a.name.toLowerCase(), nameB = b.name.toLowerCase()
            if (nameA < nameB)
                return -1
            if (nameA > nameB)
                return 1
            return 0
        })

        return sortedCandles
    },


    hexToBytes: function (hex) {
        for (var bytes = [], c = 0; c < hex.length; c += 2)
            bytes.push(parseInt(hex.substr(c, 2), 16));
        return bytes;
    },

    bytesToHex: function (bytes) {
        for (var hex = [], i = 0; i < bytes.length; i++) {
            hex.push((bytes[i] >>> 4).toString(16));
            hex.push((bytes[i] & 0xF).toString(16));
        }
        return hex.join("");
    },

    arrayObjectIndexOf: function (myArray, searchTerm) {
        for (var i = 0, len = myArray.length; i < len; i++) {
            if (myArray[i] === searchTerm) return i;
        }
        return -1;
    },

    exportBatteryStatesToCSV: function (candles) {
        var parsed = Baby.parseFiles(BatteryLogFilename, { dynamicTyping: true, skipEmptyLines: true })
        var rows = parsed.data;

        if (rows.length == 0) {
            rows.push(["Date"])
        }

        for (var candle of candles) {
            var indexOfCandle = this.arrayObjectIndexOf(rows[0], candle.name)

            if (indexOfCandle == -1) {
                for (var row of rows) {
                    row.push("")
                }
                indexOfCandle = rows[0].length - 1
                rows[0][indexOfCandle] = candle.name
            }

            var lastRow = []

            for (var i = 0, len = rows[0].length; i < len; i++) {
                lastRow.push("")
            }

            lastRow[0] = candle.updateDate
            lastRow[indexOfCandle] = candle.battery

            rows.push(lastRow)
        }

        var output = Baby.unparse(rows, { delimiter: ";" })
        return fs.writeFileAsync(BatteryLogFilename, output)
    }
};
