'use strict';

const libQ = require('kew');
const fs = require('fs-extra');
const Gpio = require('onoff').Gpio;
const io = require('socket.io-client');
const socket = io.connect('http://localhost:3000');
const MFRC522Daemon = require('./lib/mfrc522Daemon');
const MY_LOG_NAME = 'RasPi NFC plugin';

module.exports = NFCReader;

const serializeUid = function(uid){
	return id[0].toString(16)+uid[1].toString(16)+uid[2].toString(16)+uid[3].toString(16);
}

function NFCReader(context) {
	const self = this;
	self.context = context;
	self.commandRouter = self.context.coreCommand;
	self.logger = self.context.logger;

	self.handleCardDetected = function(uid) {
		self.commandRouter.pushToastMessage('success', 'NFC card detected', serializeUid(uid));
	}

	self.handleCardRemoved = function(uid) {
		self.commandRouter.pushToastMessage('success', 'NFC card removed', serializeUid(uid));
	}
}

NFCReader.prototype.onVolumioStart = function () {
	const self = this;

	const configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');
	this.config = new (require('v-conf'))();
	this.config.loadFile(configFile);

	self.logger.info("NFCReader initialized");

	return libQ.resolve();
};


NFCReader.prototype.getConfigurationFiles = function () {
	return ['config.json'];

	// TODO: Can we also read persisted assignments of tags to playlists here?
};


NFCReader.prototype.onStart = function () {
	const self = this;
	const defer = libQ.defer();

	self.registerWatchDaemon()
		.then(function (result) {
			self.logger.info("NFCReader started");
			defer.resolve();
		});

	return defer.promise;
};


NFCReader.prototype.onStop = function () {
	const self = this;
	const defer = libQ.defer();

	self.unRegisterWatchDaemon()
		.then(function (result) {
			self.logger.info("NFCReader stopped");
			defer.resolve();
		});

	return defer.promise;
};


NFCReader.prototype.onRestart = function () {
	const self = this;
};

NFCReader.prototype.onInstall = function () {
	const self = this;
};

NFCReader.prototype.onUninstall = function () {
	const self = this;
};

NFCReader.prototype.getConf = function (constName) {
	const self = this;
};

NFCReader.prototype.setConf = function (constName, constValue) {
	const self = this;
};

NFCReader.prototype.getAdditionalConf = function (type, controller, data) {
	const self = this;
};

NFCReader.prototype.setAdditionalConf = function () {
	const self = this;
};

NFCReader.prototype.setUIConfig = function (data) {
	const self = this;
};


NFCReader.prototype.getUIConfig = function () {
	const defer = libQ.defer();
	const self = this;

	self.logger.info('GPIO-Buttons: Getting UI config');

	//Just for now..
	const lang_code = 'en';

	//const lang_code = this.commandRouter.sharedconsts.get('language_code');

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


NFCReader.prototype.saveConfig = function (data) {
	const self = this;

	self.unRegisterWatchDaemon()
		.then(self.registerWatchDaemon());

	// TODO: Create a new assignment
	self.commandRouter.pushToastMessage('success', MY_LOG_NAME, "Configuration saved");
};


NFCReader.prototype.registerWatchDaemon = function () {
	const self = this;

	self.logger.info(`${ MY_LOG_NAME } Registering a thread to poll the NFC reader`);
	/* 
	TODO: Mifare RC522 is connected to the SPI bus. As far as I've seen, 
	there's no option to implement an interrupt-mechanism there, but only 
	a polling is possible => we'll read (poll) the bus and write the result 
	into a file. To this file handler, we'll attach a callback triggering 
	the actual logic
	*/
	const spiChannel = 0; //TODO: configure SPI channel
	new MFRC522Daemon(spiChannel, self.handleCardDetected, self.handleCardRemoved);

	return libQ.resolve();
};


NFCReader.prototype.clearTriggers = function () {
	const self = this;

	self.triggers.forEach(function (trigger, index, array) {
		self.logger.info("GPIO-Buttons: Destroying trigger " + index);

		trigger.unwatchAll();
		trigger.unexport();
	});

	self.triggers = [];

	return libQ.resolve();
};


NFCReader.prototype.listener = function (action, err, value) {
	const self = this;

	const c3 = action.concat('.value');
	const lastvalue = self.config.get(c3);

	// IF change AND high (or low?)
	if (value !== lastvalue && value === 1) {
		//do thing
		self[action]();
	}
	// remember value
	self.config.set(c3, value);
};





//Play / Pause
NFCReader.prototype.playPause = function () {
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
NFCReader.prototype.next = function () {
	//this.logger.info('GPIO-Buttons: next-button pressed');
	socket.emit('next')
};

//previous on playlist
NFCReader.prototype.previous = function () {
	//this.logger.info('GPIO-Buttons: previous-button pressed');
	socket.emit('prev')
};

//Volume up
NFCReader.prototype.volumeUp = function () {
	//this.logger.info('GPIO-Buttons: Vol+ button pressed');
	socket.emit('volume', '+');
};

//Volume down
NFCReader.prototype.volumeDown = function () {
	//this.logger.info('GPIO-Buttons: Vol- button pressed\n');
	socket.emit('volume', '-');
};

//shutdown
NFCReader.prototype.shutdown = function () {
	// this.logger.info('GPIO-Buttons: shutdown button pressed\n');
	this.commandRouter.shutdown();
};
