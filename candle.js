"use strict";

class Candle {
    constructor() {
        this.name;
        this.id;
        this.currentColor;
        this.desiredColor;
        this.battery;
        this.updateDate;
    }

    configureFromOtherCandle(otherCandle) {
        this.name = otherCandle.name
        this.id = otherCandle.id
        this.currentColor = otherCandle.currentColor
        this.desiredColor = otherCandle.desiredColor
        this.battery = otherCandle.battery
        this.updateDate = otherCandle.updateDate
    }
}

module.exports = Candle;