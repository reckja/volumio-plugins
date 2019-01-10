'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var config = new (require('v-conf'))();
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;

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
nfc.prototype.saveCurrentPlaylist = function (data) {
	var defer = libQ.defer();
	var self = this;

	const currentlyPlaying = function (){
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
