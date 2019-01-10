'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var Gpio = require('onoff').Gpio;
var io = require('socket.io-client');
var socket = io.connect('http://localhost:3000');
const myLoggingName = 'RasPi NFC plugin';

module.exports = MFRC522;

function MFRC522(context) {
	var self = this;
	self.context = context;
	self.commandRouter = self.context.coreCommand;
	self.logger = self.context.logger;
	self.triggers = [];
}


MFRC522.prototype.onVolumioStart = function () {
	var self = this;

	var configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');
	this.config = new (require('v-conf'))();
	this.config.loadFile(configFile);

	self.logger.info("GPIO-Buttons initialized");

	return libQ.resolve();
};


MFRC522.prototype.getConfigurationFiles = function () {
	return ['config.json'];
};


MFRC522.prototype.onStart = function () {
	var self = this;
	var defer = libQ.defer();

	self.createTriggers()
		.then(function (result) {
			self.logger.info("GPIO-Buttons started");
			defer.resolve();
		});

	return defer.promise;
};


MFRC522.prototype.onStop = function () {
	var self = this;
	var defer = libQ.defer();

	self.clearTriggers()
		.then(function (result) {
			self.logger.info("GPIO-Buttons stopped");
			defer.resolve();
		});

	return defer.promise;
};


MFRC522.prototype.onRestart = function () {
	var self = this;
};

MFRC522.prototype.onInstall = function () {
	var self = this;
};

MFRC522.prototype.onUninstall = function () {
	var self = this;
};

MFRC522.prototype.getConf = function (varName) {
	var self = this;
};

MFRC522.prototype.setConf = function (varName, varValue) {
	var self = this;
};

MFRC522.prototype.getAdditionalConf = function (type, controller, data) {
	var self = this;
};

MFRC522.prototype.setAdditionalConf = function () {
	var self = this;
};

MFRC522.prototype.setUIConfig = function (data) {
	var self = this;
};


MFRC522.prototype.getUIConfig = function () {
	var defer = libQ.defer();
	var self = this;

	self.logger.info('GPIO-Buttons: Getting UI config');

	//Just for now..
	var lang_code = 'en';

	//var lang_code = this.commandRouter.sharedVars.get('language_code');

	self.commandRouter.i18nJson(__dirname + '/i18n/strings_' + lang_code + '.json',
		__dirname + '/i18n/strings_en.json',
		__dirname + '/UIConfig.json')
		.then(function (uiconf) {

			var i = 0;
			actions.forEach(function (action, index, array) {

				// Strings for config
				var c1 = action.concat('.enabled');
				var c2 = action.concat('.pin');

				// accessor supposes actions and uiconfig items are in SAME order
				// this is potentially dangerous: rewrite with a JSON search of "id" value ?				
				uiconf.sections[0].content[2 * i].value = self.config.get(c1);
				uiconf.sections[0].content[2 * i + 1].value.value = self.config.get(c2);
				uiconf.sections[0].content[2 * i + 1].value.label = self.config.get(c2).toString();

				i = i + 1;
			});

			defer.resolve(uiconf);
		})
		.fail(function () {
			defer.reject(new Error());
		});

	return defer.promise;
};


MFRC522.prototype.saveConfig = function (data) {
	var self = this;

	actions.forEach(function (action, index, array) {
		// Strings for data fields
		var s1 = action.concat('Enabled');
		var s2 = action.concat('Pin');

		// Strings for config
		var c1 = action.concat('.enabled');
		var c2 = action.concat('.pin');
		var c3 = action.concat('.value');

		self.config.set(c1, data[s1]);
		self.config.set(c2, data[s2]['value']);
		self.config.set(c3, 0);
	});

	self.clearTriggers()
		.then(self.createTriggers());

	self.commandRouter.pushToastMessage('success', "GPIO-Buttons", "Configuration saved");
};


MFRC522.prototype.createTriggers = function () {
	var self = this;

	self.logger.info('GPIO-Buttons: Reading config and creating triggers...');

	actions.forEach(function (action, index, array) {
		var c1 = action.concat('.enabled');
		var c2 = action.concat('.pin');

		var enabled = self.config.get(c1);
		var pin = self.config.get(c2);

		if (enabled === true) {
			self.logger.info('GPIO-Buttons: ' + action + ' on pin ' + pin);
			var j = new Gpio(pin, 'in', 'both');
			j.watch(self.listener.bind(self, action));
			self.triggers.push(j);
		}
	});

	return libQ.resolve();
};


MFRC522.prototype.clearTriggers = function () {
	var self = this;

	self.triggers.forEach(function (trigger, index, array) {
		self.logger.info("GPIO-Buttons: Destroying trigger " + index);

		trigger.unwatchAll();
		trigger.unexport();
	});

	self.triggers = [];

	return libQ.resolve();
};


MFRC522.prototype.listener = function (action, err, value) {
	var self = this;

	var c3 = action.concat('.value');
	var lastvalue = self.config.get(c3);

	// IF change AND high (or low?)
	if (value !== lastvalue && value === 1) {
		//do thing
		self[action]();
	}
	// remember value
	self.config.set(c3, value);
};





//Play / Pause
MFRC522.prototype.playPause = function () {
	//this.logger.info('GPIO-Buttons: Play/pause button pressed');
	socket.emit('getState', '');
	socket.once('pushState', function (state) {
		if (state.status == 'play' && state.service == 'webradio') {
			socket.emit('stop');
		} else if (state.status == 'play') {
			socket.emit('pause');
		} else {
			socket.emit('play');
		}
	});
};

//next on playlist
MFRC522.prototype.next = function () {
	//this.logger.info('GPIO-Buttons: next-button pressed');
	socket.emit('next')
};

//previous on playlist
MFRC522.prototype.previous = function () {
	//this.logger.info('GPIO-Buttons: previous-button pressed');
	socket.emit('prev')
};

//Volume up
MFRC522.prototype.volumeUp = function () {
	//this.logger.info('GPIO-Buttons: Vol+ button pressed');
	socket.emit('volume', '+');
};

//Volume down
MFRC522.prototype.volumeDown = function () {
	//this.logger.info('GPIO-Buttons: Vol- button pressed\n');
	socket.emit('volume', '-');
};

//shutdown
MFRC522.prototype.shutdown = function () {
	// this.logger.info('GPIO-Buttons: shutdown button pressed\n');
	this.commandRouter.shutdown();
};
