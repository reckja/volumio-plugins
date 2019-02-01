'use strict';

var libQ = require('kew');
const io = require('socket.io-client');
const socket = io.connect('http://localhost:3000');


module.exports = autoOff;
function autoOff(context) {
	var self = this;

	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
	this.configManager = this.context.configManager;

	this.shutdownTimeout = null;

}

//shutdown
autoOff.prototype.shutdown = function () {
	this.logger.info('You don\'t need me. Bye\n');
	// this.commandRouter.shutdown();
};

autoOff.prototype.onVolumioStart = function () {
	var self = this;
	var configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');
	this.config = new (require('v-conf'))();
	this.config.loadFile(configFile);

	return libQ.resolve();
}

autoOff.prototype.onStart = function () {
	var self = this;
	var defer = libQ.defer();

	// register a callback for reacting on the system starting / stopping to play
	socket.on('pushState', (state) => {
		if (state.status == 'pause') {
			const timeout = self.config.get('notPlayingDuration');

			self.logger.info(`Going to shut myself down in ${timeout} seconds, unless something is played`);
			self.shutdownTimeout = setTimeout(() => {
				self.shutdown();
			}, timeout * 1000);
		} else {
			self.logger.info(`Hoooray - I'm playing again. Cancelled my shutdown`);
			clearTimeout(self.shutdownTimeout);
		}
	});

		// Once the Plugin has successfull started resolve the promise
		defer.resolve();

		return defer.promise;
	};

	autoOff.prototype.onStop = function () {
		var self = this;
		var defer = libQ.defer();

		if (this.shutdownTimeout) {
			clearTimeout(this.shutdownTimeout);
		}

		// Once the Plugin has successfull stopped resolve the promise
		defer.resolve();

		return libQ.resolve();
	};

	autoOff.prototype.onRestart = function () {
		var self = this;
		// Optional, use if you need it
	};


	// Configuration Methods -----------------------------------------------------------------------------

	autoOff.prototype.getUIConfig = function () {
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

	autoOff.prototype.getConfigurationFiles = function () {
		return ['config.json'];
	}

	autoOff.prototype.setUIConfig = function (data) {
		var self = this;
		//Perform your installation tasks here
	};

	autoOff.prototype.getConf = function (varName) {
		var self = this;
		//Perform your installation tasks here
	};

	autoOff.prototype.setConf = function (varName, varValue) {
		var self = this;
		//Perform your installation tasks here
	};



	// Playback Controls ---------------------------------------------------------------------------------------
	// If your plugin is not a music_sevice don't use this part and delete it


	autoOff.prototype.addToBrowseSources = function () {

		// Use this function to add your music service plugin to music sources
		//var data = {name: 'Spotify', uri: 'spotify',plugin_type:'music_service',plugin_name:'spop'};
		this.commandRouter.volumioAddToBrowseSources(data);
	};

	autoOff.prototype.handleBrowseUri = function (curUri) {
		var self = this;

		//self.commandRouter.logger.info(curUri);
		var response;


		return response;
	};



	// Define a method to clear, add, and play an array of tracks
	autoOff.prototype.clearAddPlayTrack = function (track) {
		var self = this;
		self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'autoOff::clearAddPlayTrack');

		self.commandRouter.logger.info(JSON.stringify(track));

		return self.sendSpopCommand('uplay', [track.uri]);
	};

	autoOff.prototype.seek = function (timepos) {
		this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'autoOff::seek to ' + timepos);

		return this.sendSpopCommand('seek ' + timepos, []);
	};

	// Stop
	autoOff.prototype.stop = function () {
		var self = this;
		self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'autoOff::stop');


	};

	// Spop pause
	autoOff.prototype.pause = function () {
		var self = this;
		self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'autoOff::pause');


	};

	// Get state
	autoOff.prototype.getState = function () {
		var self = this;
		self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'autoOff::getState');


	};

	//Parse state
	autoOff.prototype.parseState = function (sState) {
		var self = this;
		self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'autoOff::parseState');

		//Use this method to parse the state and eventually send it with the following function
	};

	// Announce updated State
	autoOff.prototype.pushState = function (state) {
		var self = this;
		self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'autoOff::pushState');

		return self.commandRouter.servicePushState(state, self.servicename);
	};


	autoOff.prototype.explodeUri = function (uri) {
		var self = this;
		var defer = libQ.defer();

		// Mandatory: retrieve all info for a given URI

		return defer.promise;
	};

	autoOff.prototype.getAlbumArt = function (data, path) {

		var artist, album;

		if (data != undefined && data.path != undefined) {
			path = data.path;
		}

		var web;

		if (data != undefined && data.artist != undefined) {
			artist = data.artist;
			if (data.album != undefined)
				album = data.album;
			else album = data.artist;

			web = '?web=' + nodetools.urlEncode(artist) + '/' + nodetools.urlEncode(album) + '/large'
		}

		var url = '/albumart';

		if (web != undefined)
			url = url + web;

		if (web != undefined && path != undefined)
			url = url + '&';
		else if (path != undefined)
			url = url + '?';

		if (path != undefined)
			url = url + 'path=' + nodetools.urlEncode(path);

		return url;
	};





	autoOff.prototype.search = function (query) {
		var self = this;
		var defer = libQ.defer();

		// Mandatory, search. You can divide the search in sections using following functions

		return defer.promise;
	};

	autoOff.prototype._searchArtists = function (results) {

	};

	autoOff.prototype._searchAlbums = function (results) {

	};

	autoOff.prototype._searchPlaylists = function (results) {


	};

	autoOff.prototype._searchTracks = function (results) {

	};
