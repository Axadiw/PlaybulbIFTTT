"use strict";

class Configuration {
    constructor() {
        this.id = Configuration.DefaultConfigurationId
        this.defaultColor = "00000000"        
        this.candles = {}
    }
}

Configuration.DefaultConfigurationId = "defaultConfiguration";

module.exports = Configuration;