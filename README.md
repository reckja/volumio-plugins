# Inofficial Volumio plugins

This repository contains inofficial plugins for the awesome Volumio audioplayer.

The goal of these plugins is to realize a DIY jukebox for kids (as yet another alternative to the [TonieBox](https://tonies.com/)), but with all the capabilities and beauties of the Volumio experience.

The whole project is (going to be) described in [another repository](https://github.com/mrsimpson/jukepi), which includes hardware, speaker, helpers.

## What you find in here

In order to achieve this, some plugins are necessary, majorly for the interaction with the I/O of the PI. Some have already been built by the community (I'll just link them below), others needed some adaption for my hardware, at least one needed to be implemented from scratch.

Here's a list of the plugins I'm using and some instruction how to use them.
_Remark: Each plugin has its own Readme, so for better understanding of each (and if one is not working as expected, check it there first)_

### GPIO buttons

|    |    |
| -- | -- |
| What this brings | Enables to configure pushbuttons connected to the GPIO |
| State | Official plugin which needed modifications|
| Installation | clone this repository, head to the [plugin folder](./plugins/system_controller/gpio-buttons) and execute `volumio plugin install` |
| Why unofficial? | [PR 293](https://github.com/volumio/volumio-plugins/pull/293) has been raised. Once it's merged, you can simply use the official version in any case and I will remove this plugin from this repository |

## NFC Reader

|    |    |
| -- | -- |
| What this brings | Enables to map NFC-tokens recorded with an SPI-based reader to a playlist |
| State | Self-built |
| Installation | clone this repository, head to the [plugin folder](./plugins/user_interface/raspi_nfc_spi) and execute `volumio plugin install` |
| Why unofficial? | I basically built this for my own prject. It's my first-time implementation of a plugin, so I'll wait some time for real user feedback (son and wife) before I dare submit an official PR ;) |
| More information | See [the plugin's readme](./plugins/user_interface/raspi_nfc_spi/Readme.md) |