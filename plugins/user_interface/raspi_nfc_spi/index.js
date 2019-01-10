'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var config = new (require('v-conf'))();
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;

const mfrc522 = require("mfrc522-rpi");

const myLoggingName = 'RasPi NFC plugin';

module.exports = nfc;
function nfc(context) {
	var self = this;

	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
	this.configManager = this.context.configManager;

}

// NFC functions
nfc.prototype.registerNFCScanner = function () {
	//# Init WiringPi with SPI Channel 0
	mfrc522.initWiringPi(0);

	//# This loop keeps checking for chips. If one is near it will get the UID and authenticate
	console.log("scanning...");
	console.log("Please put chip or keycard in the antenna inductive zone!");
	console.log("Press Ctrl-C to stop.");

	setInterval(function () {

		//# reset card
		mfrc522.reset();

		//# Scan for cards
		let response = mfrc522.findCard();
		if (!response.status) {
			console.log("No Card");
			return;
		}
		console.log("Card detected, CardType: " + response.bitSize);

		//# Get the UID of the card
		response = mfrc522.getUid();
		if (!response.status) {
			console.log("UID Scan Error");
			return;
		}
		//# If we have the UID, continue
		const uid = response.data;
		console.log("Card read UID: %s %s %s %s", uid[0].toString(16), uid[1].toString(16), uid[2].toString(16), uid[3].toString(16));

		//# Select the scanned card
		const memoryCapacity = mfrc522.selectCard(uid);
		console.log("Card Memory Capacity: " + memoryCapacity);

		//# This is the default key for authentication
		const key = [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF];

		//# Authenticate on Block 8 with key and uid
		if (!mfrc522.authenticate(8, key, uid)) {
			console.log("Authentication Error");
			return;
		}

		//# Dump Block 8
		console.log("Block: 8 Data: " + mfrc522.getDataForBlock(8));

		//# Stop
		mfrc522.stopCrypto();

	}, 500);
}

nfc.prototype.saveCurrentPlaylist = function (data) {
	var defer = libQ.defer();
	var self = this;

	const currentlyPlaying = function () {
		return true;
	}

	if (currentlyPlaying) {
		// verify that an NFC-tag is currently visible to the reader
		if (1 === 1) {
			self.commandRouter.pushToastMessage('success', myLoggingName, self.commandRouter.getI18nString('COMMON.SETTINGS_SAVED_SUCCESSFULLY'));
			defer.resolve();
		}
		else {
			self.commandRouter.pushToastMessage('error', myLoggingName, self.commandRouter.getI18nString('COMMON.SETTINGS_SAVE_ERROR'));
			defer.reject(new Error());
		}
	} else {
		defer.resolve();

		return defer.promise;
	};
}

// Volumio framework hooks
nfc.prototype.onVolumioStart = function () {
	var self = this;
	var configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');
	this.config = new (require('v-conf'))();
	this.config.loadFile(configFile);

	return libQ.resolve();
}

nfc.prototype.onStart = function () {
	var self = this;
	var defer = libQ.defer();

	// register a function which periodically reads tags and triggers play/pause
	// TODO
	self.registerNFCScanner();

	// Once the Plugin has successfull started resolve the promise
	defer.resolve();

	return defer.promise;
};

nfc.prototype.onStop = function () {
	var self = this;
	var defer = libQ.defer();

	// Once the Plugin has successfull stopped resolve the promise
	defer.resolve();

	return libQ.resolve();
};

nfc.prototype.onRestart = function () {
	var self = this;
	// Optional, use if you need it
};


// Configuration Methods -----------------------------------------------------------------------------

nfc.prototype.getUIConfig = function () {
	var defer = libQ.defer();
	var self = this;

	var lang_code = this.commandRouter.sharedVars.get('language_code');

	self.commandRouter.i18nJson(__dirname + '/i18n/strings_' + lang_code + '.json',
		__dirname + '/i18n/strings_en.json',
		__dirname + '/UIConfig.json')
		.then(function (uiconf) {


			defer.resolve(uiconf);
		})
		.fail(function () {
			defer.reject(new Error());
		});

	return defer.promise;
};

nfc.prototype.getConfigurationFiles = function () {
	return ['config.json'];
}

nfc.prototype.setUIConfig = function (data) {
	var self = this;
	//Perform your installation tasks here
};

nfc.prototype.getConf = function (varName) {
	var self = this;
	//Perform your installation tasks here
};

nfc.prototype.setConf = function (varName, varValue) {
	var self = this;
	//Perform your installation tasks here
};
