#!/bin/bash

DPKG_ARCH=`dpkg --print-architecture`

if [ "$DPKG_ARCH" = "armhf" ];
then
    echo "Installing nfc Dependencies - if there are"
    echo "plugininstallend"    
else
    echo "This plugin only works on Raspberry PI"
fi
