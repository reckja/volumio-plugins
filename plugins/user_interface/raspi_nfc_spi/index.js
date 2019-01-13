'use strict';

const libQ = require('kew');
const fs = require('fs-extra');
const io = require('socket.io-client');
const socket = io.connect('http://localhost:3000');
const MFRC522Daemon = require('./lib/mfrc522Daemon');
const getTokenManager = require('./lib/getTokenManager');

const MY_LOG_NAME = 'RasPi NFC plugin';

module.exports = NFCReader;

function NFCReader(context) {
	const self = this;
	self.context = context;
	self.commandRouter = self.context.coreCommand;
	self.logger = self.context.logger;

	self.tokenManager = getTokenManager(self.logger);
}

NFCReader.prototype.onVolumioStart = function () {
	const self = this;

	const configFile = self.commandRouter.pluginManager.getConfigurationFile(self.context, 'config.json');
	self.config = new (require('v-conf'))();
	self.config.loadFile(configFile);

	self.logger.info("NFCReader initialized");

	return libQ.resolve();
};


NFCReader.prototype.getConfigurationFiles = function () {
	return ['config.json'];
};


NFCReader.prototype.onStart = function () {
	const self = this;
	const defer = libQ.defer();

	// register callback to sniff which playlist is currently playing
	socket.on('playingPlaylist', function (playlist) {
		effectivePlaylist = playlist;
		self.logger.info('Currently playing playlist', effectivePlaylist)
	});

	// Configuration default values
	if (!self.config.get('spi')) {
		self.config.set('spi', 0);
	}

	if (!self.config.get('pollingRate')) {
		self.config.set('pollingRate', 500);
	}

	if (!self.config.get('debounceThreshold')) {
		self.config.set('debounceThreshold', 1);
	}

	self.registerWatchDaemon()
		.then(function () {
			self.logger.info("NFCReader started");
			defer.resolve();
		});

	return defer.promise;
};


NFCReader.prototype.onStop = function () {
	const self = this;
	const defer = libQ.defer();

	self.unRegisterWatchDaemon()
		.then(function () {
			self.logger.info("NFCReader stopped");
			defer.resolve();
		});

	socket.removeAllListeners();

	return defer.promise;
};


NFCReader.prototype.onRestart = function () {
	const self = this;

	self.unRegisterWatchDaemon()
		.then(() => self.registerWatchDaemon());
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

	const lang_code = self.commandRouter.sharedVars.get('language_code');

	self.commandRouter.i18nJson(__dirname + '/i18n/strings_' + lang_code + '.json',
		__dirname + '/i18n/strings_en.json',
		__dirname + '/UIConfig.json')
		.then(function (uiconf) {
			uiconf.sections[1].content[0].value.value = self.config.get('spi');
			uiconf.sections[1].content[1].value = self.config.get('pollingRate');
			uiconf.sections[1].content[2].value = self.config.get('debounceThreshold');

			socket.emit('listPlaylist');
			socket.once('pushListPlaylist', (playlists) => {

				// fill playlist select box
				playlists.map((playlist)=>{
					uiconf.sections[0].content[0].options.push({value: playlist, label: playlist});
				});

				// the currently playing playlist is the default
				if (effectivePlaylist) {
					uiconf.sections[0].content[0].value.value = effectivePlaylist;
					uiconf.sections[0].content[0].value.label = effectivePlaylist;
				}

				// dynamically create elements for all assigments to delete them
				self.tokenManager.getAllAssignments().map((assignment) => {
					self.logger.info('Found assignment', JSON.stringify(assignment));

					uiconf.sections[2].content.push(
						{
							"id": `unassign_${assignment.uid}`,
							"element": "button",
							"label": `${assignment.data}`,
							"onClick": {
								"type": "emit",
								"message": "callMethod",
								"data": {
									"endpoint": "user_interface/raspi_nfc_spi",
									"method": "unassignToken",
									"data": assignment.uid
								}
							}
						});

				})
				defer.resolve(uiconf);
			})
		})
		.fail(function () {
			defer.reject(new Error());
		});

	return defer.promise;
};


NFCReader.prototype.saveConfiguration = function (data) {
	const self = this;

	self.logger.info(MY_LOG_NAME, 'Saving config', JSON.stringify(data));

	self.config.set('spi', data.spi.value);
	self.config.set('pollingRate', data.pollingRate);
	self.config.set('debounceThreshold', data.debounceThreshold);

	self.commandRouter.pushToastMessage('success', MY_LOG_NAME, "Configuration saved");

	self.unRegisterWatchDaemon()
		.then(() => self.registerWatchDaemon());
};

NFCReader.prototype.handleCardDetected = function (uid) {
	const self = this;

	// self.commandRouter.pushToastMessage('success', 'NFC card detected', serializeUid(uid));
	self.currentTokenUid = uid;
	self.logger.info('NFC card detected', self.currentTokenUid);
	const playlist = self.tokenManager.readToken(self.currentTokenUid);

	self.logger.info(`${MY_LOG_NAME} requesting to play playlist`, playlist);
	self.commandRouter.pushToastMessage('success', MY_LOG_NAME, `requesting to play playlist ${playlist}`);

	if (playlist && playlist !== effectivePlaylist) {
		socket.emit('playPlaylist', {
			"name": playlist
		});
	}
}

NFCReader.prototype.handleCardRemoved = function (uid) {
	const self = this;
	// self.commandRouter.pushToastMessage('success', 'NFC card removed', serializeUid(uid));
	self.currentTokenUid = null;
	self.logger.info('NFC card removed', uid);
}

NFCReader.prototype.registerWatchDaemon = function () {
	const self = this;

	self.logger.info(`${MY_LOG_NAME} Registering a thread to poll the NFC reader`);

	const spiChannel = self.config.get('spi');
	const pollingRate = self.config.get('pollingRate');
	const debounceThreshold = self.config.get('debounceThreshold');

	self.logger.info(MY_LOG_NAME, 'SPI channel', spiChannel);
	self.logger.info(MY_LOG_NAME, 'polling rate', pollingRate);
	self.logger.info(MY_LOG_NAME, 'debounce threshold', debounceThreshold);

	self.nfcDaemon = new MFRC522Daemon(spiChannel, self.handleCardDetected.bind(this), self.handleCardRemoved.bind(this), self.logger, pollingRate, debounceThreshold);

	self.nfcDaemon.start();
	return libQ.resolve();
};

NFCReader.prototype.unRegisterWatchDaemon = function () {
	const self = this;

	self.logger.info(`${MY_LOG_NAME}: Stopping NFC daemon`);
	self.nfcDaemon.stop();
	return libQ.resolve();
};

NFCReader.prototype.assignPlaylist = function (playlist) {
	const self = this;
	const effectivePlaylist = playlist || self.currentPlaylist;

	if (!self.currentTokenUid) {
		self.commandRouter.pushToastMessage('error', MY_LOG_NAME, "No NFC token detected");
		return false;
	}

	if (!effectivePlaylist) {
		self.commandRouter.pushToastMessage('error', MY_LOG_NAME, "Start the playlist which shall be assigned");
		return false;
	}

	self.logger.info('I shall assign token UID', self.currentTokenUid, 'to', effectivePlaylist);

	try {
		if (self.currentTokenUid && effectivePlaylist
			&& self.tokenManager.assignToken(self.currentTokenUid, effectivePlaylist)) {

			// self.commandRouter.pushToastMessage('success', MY_LOG_NAME, `Token ${self.currentTokenUid} assigned to ${effectivePlaylist}`);
			self.commandRouter.pushToastMessage('success', MY_LOG_NAME, `Token ${self.currentTokenUid} assigned to ${effectivePlaylist}`);
			return true;
		};
	} catch (err) {
		self.logger.info(`${MY_LOG_NAME}: could not assign token uid`, self.currentTokenUid, err);
	}
}

/**
 * Removes the assigment of a token to a playlist.
 * It can either operate based on the currently playing token 
 * or alternatively be passed a uid.
 */
NFCReader.prototype.unassignToken = function (data = null) {
	const self = this;
	const tokenUid = data || self.currentTokenUid;

	self.logger.info(MY_LOG_NAME, 'shall unassign token', tokenUid);

	if (!tokenUid) {
		self.commandRouter.pushToastMessage('error', MY_LOG_NAME, "No NFC token detected");
		return false;
	}

	const unassignedPlaylist = self.tokenManager.unassignToken(tokenUid);
	if (unassignedPlaylist) {
		// self.commandRouter.pushToastMessage('success', MY_LOG_NAME, `Token ${self.currentTokenUid} unassigned (was ${unassignedPlaylist})`);
		self.commandRouter.pushToastMessage('success', MY_LOG_NAME, `Token ${tokenUid} unassigned (was ${unassignedPlaylist})`);
	}
}
