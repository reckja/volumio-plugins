'use strict';

const libQ = require('kew');
const fs = require('fs-extra');
const io = require('socket.io-client');
const socket = io.connect('http://localhost:3000');
const MFRC522Daemon = require('./lib/mfrc522Daemon');
const TokenManager = require('./lib/tokenManager');

const CONFIG_PATH = '/data/configuration/user_interface/raspi_nfc_spi/';
const MY_LOG_NAME = 'RasPi NFC plugin';

module.exports = NFCReader;

const serializeUid = function (uid) {
	return uid && uid[0]
		? uid[0].toString(16) + uid[1].toString(16) + uid[2].toString(16) + uid[3].toString(16)
		: JSON.stringify(uid);
}

function NFCReader(context) {
	const self = this;
	self.context = context;
	self.commandRouter = self.context.coreCommand;
	self.logger = self.context.logger;

	const handleCardDetected = function (uid) {
		// self.commandRouter.pushToastMessage('success', 'NFC card detected', serializeUid(uid));
		self.currentTokenUid = uid;
		self.logger.info('NFC card detected', serializeUid(uid));
	}

	const handleCardRemoved = function (uid) {
		// self.commandRouter.pushToastMessage('success', 'NFC card removed', serializeUid(uid));
		self.currentTokenUid = null;
		self.logger.info('NFC card removed', serializeUid(uid));
	}

	const spiChannel = 0; //TODO: configure SPI channel
	self.nfcDaemon = new MFRC522Daemon(spiChannel, handleCardDetected, handleCardRemoved, self.logger);

	self.tokenManager = new TokenManager(CONFIG_PATH + 'tokenmanager.db', self.logger);
}

NFCReader.prototype.onVolumioStart = function () {
	const self = this;

	const configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');
	this.config = new (require('v-conf'))();
	this.config.loadFile(configFile);

	self.logger.info("NFCReader initialized");


	// register callback to sniff which playlist is currently playing
	socket.on('playPlaylist', function (data) {
		self.currentPlaylist = data.name;
		self.logger.info('Currently playing playlist', currentPlaylist)
	});

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

	self.logger.info(MY_LOG_NAME, 'Getting UI config');

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

	self.logger.info(`${MY_LOG_NAME} Registering a thread to poll the NFC reader`);
	/* 
	TODO: Mifare RC522 is connected to the SPI bus. As far as I've seen, 
	there's no option to implement an interrupt-mechanism there, but only 
	a polling is possible => we'll read (poll) the bus and write the result 
	into a file. To this file handler, we'll attach a callback triggering 
	the actual logic
	*/
	const spiChannel = 0; //TODO: configure SPI channel
	self.nfcDaemon.start();
	return libQ.resolve();
};

NFCReader.prototype.unRegisterWatchDaemon = function () {
	const self = this;

	self.logger.info(`${MY_LOG_NAME}: Stopping NFC daemon`);
	self.nfcDaemon.stop();
	return libQ.resolve();
};

NFCReader.prototype.saveCurrentPlaying = function () {
	const self = this;

	self.logger.info('assigning token UID', self.currentTokenUid, 'to', self.currentPlaylist);
	self.currentTokenUid && self.currentPlaylist 
		&& self.tokenManager.registerToken(self.currentTokenUid, self.currentPlaylist );
}
