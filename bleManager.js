"use strict";

var log = require('./logging.js');

var Promise = require('bluebird')
var Candle = require('./candle.js')
var Tools = require("./tools.js");

const colorsCharacteristicUUID = "fffc"
const batteryCharacteristicUUID = "2a19"
const batteryServiceUUID = "180f"
const playbulbServiceUUID = "ff02"
const operationsDelayMilliseconds = 2000
const disconnectDelayMilliseconds = 10000
const scanningForPeripheralsTime = 20000
const performBLEActionTimeout = 10000

class BLEManager {
	constructor() {
		this.noble = Promise.promisifyAll(require('noble'))
		this.knownCandles = {}
		this.defaultColor
	}

	candleForPeripheral(peripheral) {
		if (peripheral.id in this.knownCandles) {
			return this.knownCandles[peripheral.id]
		}

		var newCandle = new Candle()
		newCandle.id = peripheral.id
		newCandle.desiredColor = this.defaultColor
		newCandle.name = peripheral.advertisement.localName
		this.knownCandles[peripheral.id] = newCandle

		return newCandle
	}

	performSingleCandlesLoop(updateColors, turnOn) {
		if (updateColors && Object.keys(this.knownCandles).length > 0 && this.areAllCandlesSatisfied(turnOn)) {
			return Promise.reject(new Error())
		}

		var thisManager = this;
		return new Promise((resolve, reject) => {

			var foundPeripherals = 0
			var timeoutOccured = false

			var finishFunc = function () {
				if (foundPeripherals == 0 && timeoutOccured) {
					resolve(thisManager.knownCandles)
				}
			}

			var handleDiscovery = function (peripheral) {
				var peripheral = Promise.promisifyAll(peripheral)
				log.debug('Found device with local name: ' + peripheral.advertisement.localName);
				log.debug('advertising the following service uuid\'s: ' + peripheral.advertisement.serviceUuids);

				foundPeripherals += 1
				var candle = thisManager.candleForPeripheral(peripheral)

				peripheral.connectAsync()
					.timeout(performBLEActionTimeout)
					.delay(operationsDelayMilliseconds)
					.then(function () {
						log.debug("Connected, will discover service " + serviceUUID + " and characteristic " + characteristicUUID + " for " + peripheral.advertisement.localName)
						return thisManager.readBatteryForPeripheral(peripheral)
					})
					.then(function (battery) {
						if (battery) {
							candle.battery = battery.readInt8()
							var utc = new Date().toLocaleString("en-US", { hour12: false })
							candle.updateDate = utc
						}
					})
					.catch(function () { })
					.then(function () {
						if (updateColors) {
							var colorToSet = turnOn ? candle.desiredColor : BLEManager.TurnedOffColor
							return thisManager.setColorForPeripheral(peripheral, colorToSet)
						}
					})
					.then(function () {
						return thisManager.readColorForPeripheral(peripheral)
					})
					.then(function (color) {
						if (color) {
							candle.currentColor = color
							var utc = new Date().toLocaleString("en-US", { hour12: false })
							candle.updateDate = utc
						}
					})
					.delay(disconnectDelayMilliseconds)
					.then(function () {
						log.debug("Will disconnect from " + peripheral.advertisement.localName)
						return peripheral.disconnectAsync()
					})
					.finally(function () {
						foundPeripherals -= 1
						finishFunc()
					})
			}

			thisManager.noble.on('discover', handleDiscovery)

			thisManager.noble.startScanning([playbulbServiceUUID], false)
			setTimeout(function () {
				log.debug("Stopping scanning")
				timeoutOccured = true
				thisManager.noble.stopScanning()
				thisManager.noble.removeListener("discover", handleDiscovery)
				finishFunc()
			}, scanningForPeripheralsTime);
		})
	}

	areAllCandlesSatisfied(shouldBeTurnedOn) {
		for (var key in this.knownCandles) {
			let candle = this.knownCandles[key];
			var desiredColor = shouldBeTurnedOn ? candle.desiredColor : BLEManager.TurnedOffColor

			if (candle.currentColor != desiredColor) {
				return false
			}
		}

		return true
	}

	isPoweredOnAsync() {
		var thisManager = this;
		return new Promise((resolve, reject) => {

			if (thisManager.noble.state == "poweredOn") {
				resolve()
			}

			thisManager.noble.on('stateChange', function (state) {
				if (thisManager.noble.state == "poweredOn") {
					resolve()
				}
			})
		})
	}

	// Candles operations
	readBatteryForPeripheral(peripheral) {
		return this.readValueForCharacteristic(peripheral, batteryServiceUUID, batteryCharacteristicUUID)
			.then(function (value) {
				log.debug("Battery for " + peripheral.advertisement.localName + " = " + value)
				return value
			})
			.catch(function () { })
	}

	readColorForPeripheral(peripheral) {
		return this.readValueForCharacteristic(peripheral, playbulbServiceUUID, colorsCharacteristicUUID)
			.then(function (value) {
				var colorHex = Tools.bytesToHex(value)
				log.debug("Color for " + peripheral.advertisement.localName + " = " + value)

				return colorHex
			})
			.catch(function () { })
	}

	setColorForPeripheral(peripheral, color) {
		var colorBytes = Tools.hexToBytes(color)
		return this.setValueForCharacteristic(peripheral, playbulbServiceUUID, colorsCharacteristicUUID, colorBytes)
			.catch(function () { })
	}

	// Generic
	readValueForCharacteristic(peripheral, serviceUUID, characteristicUUID) {
		var returnValue = null
		return this.performActionWithColorCharacteristic(peripheral, serviceUUID, characteristicUUID,
			function (characteristic) {
				return characteristic[0].readAsync()
					.timeout(performBLEActionTimeout)
					.then(function (value) {
						log.debug("Read value: '" + value + "' for characteristic: '" + characteristicUUID + "' for: " + peripheral.advertisement.localName)
						returnValue = value
						return returnValue
					})
			}
		)
			.then(function () {
				return returnValue
			})
	}

	setValueForCharacteristic(peripheral, serviceUUID, characteristicUUID, value) {
		return this.performActionWithColorCharacteristic(peripheral, serviceUUID, characteristicUUID,
			function (characteristic) {
				log.debug("Will set value: '" + value + "' to characteristic: '" + characteristicUUID + "' for: " + peripheral.advertisement.localName)
				return characteristic[0].writeAsync(new Buffer(value), true)
					.timeout(performBLEActionTimeout)
					.then(function () {
						log.debug("Did set value: '" + value + "' to characteristic: '" + characteristicUUID + "' for: " + peripheral.advertisement.localName)
					})
			}
		)
	}

	performActionWithColorCharacteristic(peripheral, serviceUUID, characteristicUUID, action) {
		return peripheral.discoverSomeServicesAndCharacteristicsAsync([serviceUUID], [characteristicUUID])
			.timeout(performBLEActionTimeout)
			.delay(operationsDelayMilliseconds)
			.map(function (services, characteristics) {
				log.debug("Discovered services and characteristics for " + peripheral.advertisement.localName)
				for (let characteristic of services.characteristics) {
					if (characteristic.uuid == characteristicUUID) {
						return Promise.promisifyAll(characteristic)
					}
				}
			})
			.then(action)
	}
}

BLEManager.TurnedOffColor = "00000000"

module.exports = BLEManager;