'use strict';

const mfrc522 = require('mfrc522-rpi');

class MFRC522Daemon {
    constructor(spiChannel, onCardDetected, onCardRemoved, logger=console, interval=500) {
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
                    onCardRemoved(self.currentUID);
                    self.currentUID = null;
                }
            } else {
                const uid = mfrc522.getUid().data;
//		self.logger.info('UID', JSON.stringify(uid));
                if (!self.currentUID || self.currentUID.toString() !== uid.toString()) {
                    self.currentUID = uid;
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
