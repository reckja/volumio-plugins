'use strict';

const mfrc522 = require('mfrc522-rpi');

class MFRC522Daemon{
    constructor(spiChannel, onCardDetected, onCardRemoved, interval=500) {
        mfrc522.initWiringPi(spiChannel);
        this.interval = interval;
        this.onCardDetected = onCardDetected;
        this.onCardRemoved = onCardRemoved;

        this.intervalHandle = null;
        this.currentUID = null;

        this.watcher = function (){
            //# reset card
            mfrc522.reset();

            //# Scan for cards
            let response = mfrc522.findCard();
            if (!response.status) {
                if(this.currentUID){
                    this.onCardRemoved(this.currentUID);
                    this.currentUID = null;
                }
            } else {
                response = mfrc522.getUid();
                if (this.currentUID !== response) {
                    this.currentUID = response;
                    this.onCardDetected(this.currentUID);
                }
            }
        }
    }

    start(){
        this.intervalHandle = setInterval(this.watcher, this.interval);
    }

    stop(){
        clearInterval(this.intervalHandle);
    }
}

module.exports = MFRC522Daemon;