'use strict';

const mfrc522 = require('mfrc522-rpi');
const serializeUid = require('./serializeUid');

const DEBOUNCE_THRESHOLD = 5; // max disconnects before it is considered disconnected

class MFRC522Daemon {
    constructor(spiChannel, onCardDetected, onCardRemoved, logger = console, interval = 500) {
        mfrc522.initWiringPi(spiChannel);

        const self = this;

        self.interval = interval;
        self.logger = logger;

        self.intervalHandle = null;
        self.currentUID = null;

        self.watcher = function () {
            //# reset card
            mfrc522.reset();

            //# Scan for cards
            let response = mfrc522.findCard();
            //self.logger.info('NFC reader daemon:', JSON.stringify(response));
            if (!response.status) {
                if (self.currentUID) {
                    if (self.debounceCounter === DEBOUNCE_THRESHOLD) {
                        onCardRemoved(self.currentUID);
                        self.currentUID = null;
                    } else {
                        self.debounceCounter++;
                    }
                }
            } else {
                const uid = serializeUid(mfrc522.getUid().data);
                //self.logger.info('UID', JSON.stringify(uid));
                if (!self.currentUID || self.currentUID !== uid) {
                    self.currentUID = uid;
                    self.debounceCounter = 0;
                    onCardDetected(self.currentUID);
                }
            }
        }
    }

    start() {
        this.logger.info('NFC Daemon:', `going to poll the reader every ${this.interval}ms`);
        this.intervalHandle = setInterval(this.watcher, this.interval);
    }

    stop() {
        clearInterval(this.intervalHandle);
    }
}

module.exports = MFRC522Daemon;
