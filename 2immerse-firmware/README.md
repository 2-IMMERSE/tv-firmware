2immerse TV Emulator firmware
=============================

The 2-Immerse TV emulator firmware is built as a debian package. It is comprised of:

- A kiosk service using the Chromium web browser 
- A captive portal / wireless access point implementation
- A web server / socket.io server to host web applications used by the kiosk and captive portal
- A python dvbcsstv-proxy-server 
- An app-to-app/DIAL server 

Services are configured to run as linux system daemons using init.d on boot.

Building the firmware
---------------------

To build the 2-Immerse TV emulator firmware, run:

```
make all PRIVATE_KEY_FILENAME=~/.ssh/irt_rsa
```

Substitute ~/.ssh/irt_rsa with a deploy key (or your private key) for git. Additional build targets are available for development.
The build process runs in a docker container which needs a valid git deploy key in order to download the server-tvemu repositories.
PRIVATE_KEY_FILENAME should be set to filepath of the private key on the host system.

Additional build targets are available for tighter development iterations. For more information run:

```
make info
```

Development workflow for webcontent
===================================

In order to iterate quickly on the development of the web application, 3 additional build targets are provided: 

To limit what get's built to just the web application content (minify javascript, compile SASS etc.), run:

```
make www
```

The dockerimage used to build the content can also be used to host a running instance of the web server used by the firmware. 
This is useful for development. Firstly, the web server must be built:

```
make firmware-server
```

Note: This also builds the web application content.
To run the web server, use:

```
make run-dev-server
```

Note: The 'run-dev-server' build target will also build the firmware-server and www content, if it hasn't been built already.
Once the web server is running, you can update the content by just using 'make www'.

Logging
-------

The 2Immerse TV Emulator Firmware services write debug log files to /var/log

- dvbcsstv-proxy server: /var/log/dvbcsstv.log
- app2app/DIAL server: /var/log/tvemu.log
- firmware web server: /var/log/2immerse-firmware.log
- kiosk service: /var/log/syslog

Licenses
--------

The firmware's captive portal implementation is based on Shaba Abhiram's Raspberry Pi Wifi Configuration project released under the MIT license.
https://github.com/sabhiram/raspberry-wifi-conf
