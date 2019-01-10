#!/bin/bash

DPKG_ARCH=`dpkg --print-architecture`

if [ "$DPKG_ARCH" = "armhf" ];
then
    echo "Installing nfc Dependencies - if there are"
    # we should also verify that the mifare reader is available on /dev/spidev0.0
    echo "SPI NFC reader plugin installed"
else
    echo "This plugin only works on Raspberry PI"
fi

