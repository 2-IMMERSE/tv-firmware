// Copyright 2019 British Broadcasting Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


var express     = require('express'),
    app         = express(),
    http        = require('http'),
    https       = require('https'),
    cors        = require('cors'),
    bodyParser  = require('body-parser'),
    config      = require("./config"),
    logger      = require("./logger.js"),
    fs          = require('fs'),
    exec        = require("child_process").exec,
    util        = require('util');

// TODO: Allow filename to be specified on the command-line
var adminConfigFilename = "/var/lib/2immerse-admin-config.json";
var apConfigFilename = "/var/lib/2immerse-ap.conf";
var friendlyNameFilename = "/var/lib/2immerse-friendly-name";

function initServer(webroot, networkManager, options, adminConfig) {
    var startupMsg = "";
    var server = null;
    var configuringWifi = false;
    var accessPointList = null;
    var networkState = null;

    if (options.https) {
        server = https.createServer(options.certs, app);
        startupMsg = 'HTTPS with self-signed certificate!';
    } else {
        server = http.Server(app);
    }

    var io = require('socket.io').listen(server);

    // socket.io namspace
    var ionsp = io.of("/notify");

    app.enable('trust proxy'); // Work with proxies.

    app.set("view engine", "ejs");
    app.set("views", "views");
    app.set("trust proxy", true);

    // Cross origin scripting is permitted.
    // Maybe this could be tightened up to only service requests from the 2Immerse origin.
    app.use(cors());
    app.use('/', express.static(webroot));
    app.use(bodyParser.json());        // to support JSON-encoded bodies
    app.use(bodyParser.urlencoded({ extended: true })); // to support URL-encoded bodies

    var pendingConnectionTimer = null;
    
    function iwlistTimeout() {

        function signalStrengthIndicator(db){
            if(db <= 67){
                return "images/wifi.svg";
            } else if(db <= 73){
                return "images/wifi-medium.svg";
            } else{
                return "images/wifi-low.svg";
            }
        }//fnc signalStrengthIndicator
        
        function isEncrypted(encrypted){
            if (encrypted == "on") {
                return "images/lock.svg";
            } else {
                return "";
            }
        }//fnc isEncrypted

        // Scan for available wifi devices
        networkManager.IwList(function(error, result) {
            var scanResults = (error) ? [] : result[0].scan_results;
    
            scanResults.sort(function(a,b) {
                var x = parseInt(a.signal_strength);
                var y = parseInt(b.signal_strength);
                if (x > y) {
                    return 1;
                }
                if (x < y) {
                    return -1;
                }
                return 0;
            });
            
            var uniqueSSIDs = [];
            var scanResultsDuplicatesRemoved = [];

            scanResults.forEach(function(currentResult,index, array){
                currentResult.signalImage = signalStrengthIndicator(currentResult.signal_strength);
                currentResult.encryptedImage = isEncrypted(currentResult.encrypted);
                if(uniqueSSIDs.indexOf(currentResult.ssid) == -1){
                    uniqueSSIDs.push(currentResult.ssid);
                    scanResultsDuplicatesRemoved.push(currentResult);
                }
            });

            accessPointList = scanResultsDuplicatesRemoved;

            setTimeout(iwlistTimeout, 4000);
        });
    }

    function restartKiosk(callback) {
        exec("restart-kiosk", function(err, stdout, stderr) {
            if(err) {
                logger.log('error', "Failed to restart kiosk - restart-kiosk script failed.\n" + stderr);
            }
            callback(err);
        });
    }

    function loadServerPresets(presetsUrl, callback) {

        https.get(presetsUrl, function(resp) {
            var data = '';

            resp.on('data', function(chunk) {
                data += chunk;
            });

            resp.on('end', function() {
                try {
                    var obj = JSON.parse(data);
                    callback(obj);
                } catch(e) {
                    logger.log(e);
                    callback(null);
                }
            });

        }).on("error", function(err) {
            logger.log("Error: " + err.message);
            callback(null);
        });
    }

    function writeAdminConfig(callback) {
        var content = JSON.stringify(adminConfig, null, 4); // Make JSON human readable
        fs.writeFile(adminConfigFilename, content, 'utf8', function (err) {
            if (err) {
                logger.log('error', "Failed to write '" + adminConfigFilename + "'");
            } else {
                logger.log('info', 'Wrote new config: ' + content);
            }
            callback(err);
        });
    }

    function writeSubnetConfig(callback) {
        var content = util.format('AP_GATEWAY_ADDR=%s\nAP_SUBNET_IP=%s\nAP_CIDR_MASK=%s\nAP_DHCP_START=%s\nAP_DHCP_END=%s\nAP_DHCP_LEASE=%s\nAP_CHANNEL=%s\n',
            adminConfig.gateway, adminConfig.subnet, adminConfig.cidr, adminConfig.dhcpStart, adminConfig.dhcpEnd, adminConfig.dhcpLease, adminConfig.wifiChannel);
        fs.writeFile(apConfigFilename, content, 'utf8', function (err) {
            if (err) {
                logger.log('error', "Failed to write '" + apConfigFilename + "'");
            } else {
                logger.log('info', 'Wrote new subnet config: ' + content);
            }
            callback(err);
        });
    }

    function writeFriendlyName(callback) {
        fs.writeFile(friendlyNameFilename, adminConfig.friendlyName, 'utf8', function(err) {
            if (err) {
                logger.log('error', "Failed to write '" + friendlyNameFilename + "'");
            } else {
                logger.log('info', 'Wrote new subnet config: ' + adminConfig.friendlyName);
            }
            callback(err);
        });
    }

    function CalcSubnetAddress(gateway, cidr) {
        var octets = gateway.split('.');
        var val = (parseInt(octets[0], 10)<<24)
                | (parseInt(octets[1], 10)<<16)
                | (parseInt(octets[2], 10)<<8)
                | parseInt(octets[3], 10);
        var shift = (32 - parseInt(cidr, 10));
        var subnet = val>>>shift;
        subnet <<= shift;
        return (subnet>>>24) + "."
                + ((subnet>>>16)&0xff) + "."
                + ((subnet>>>8)&0xff) + "."
                + (subnet&0xff);
    }

    // Serves captive portal page to non-TV device.
    app.get("/", function(request, response) {
        response.render("captiveportal");
        response.end();
    });

    function renderAdminPanel(response) {
        loadServerPresets(adminConfig.presetsUrl, function(result) {
            response.render("admin", { adminConfig: adminConfig, serverPresets: result });
            //response.end();            
        });
    }

    app.get("/admin", function(request, response) {
        renderAdminPanel(response);
    });

    app.post("/admin", function(request, response) {

        logger.log('info', JSON.stringify(request.body, null, 4));

        adminConfig.serverEnv = request.body.serverEnv;
        adminConfig.launchUrl = request.body.launchUrl;
        adminConfig.presetsUrl = request.body.presetsUrl;
        // checkbox POST value will only exist in response if checkbox is checked.
        // Therefore, presence in the response object implies "true"
        //adminConfig.showMousePointer = (request.body.showMousePointer) ? "true" : "false";
        adminConfig.gateway = request.body.gateway;
        adminConfig.cidr = request.body.cidr;
        adminConfig.subnet = CalcSubnetAddress(adminConfig.gateway, adminConfig.cidr);
        adminConfig.dhcpStart = request.body.dhcpStart;
        adminConfig.dhcpEnd = request.body.dhcpEnd;
        adminConfig.dhcpLease = request.body.dhcpLease;
        adminConfig.friendlyName = request.body.friendlyName;
        adminConfig.wifiChannel = request.body.wifiChannel;

        writeAdminConfig(function(err) {
            if(err) {
                response.sendStatus(500);
            } else {
                // Also write subnet config for use by configure-network script
                writeSubnetConfig(function(err) {
                    if(err) {
                        response.sendStatus(500);
                    } else {
                        writeFriendlyName(function(err) {
                            if(err) {
                                response.sendStatus(500);
                            } else {
                                restartKiosk(function(err) {
                                    if(err) {
                                        response.sendStatus(500);
                                    } else {
                                        renderAdminPanel(response);
                                    }
                                });
                            }                          
                        });
                    }
                });
            }
        });
    });

    // Serves the contents of the captive portal wifi list
    app.get("/iwlist", function(request, response) {
        response.render("wlist", { cells: accessPointList });
        response.end();
    });

    // Service endpoint for switching TV to a different web page
    app.post("/href", function (request, response) {
        var url = request.body.url;
        //if(validUrl.isUri(url)) {
            ionsp.emit('href', url);
            response.sendStatus(200);
        //} else {
        //    response.sendStatus(400);
        //}
    });

    // Notifications from low-level network system about device up/down state changes
    app.post("/network", function (request, response) {
        
        var notification = {
            iface: request.body.iface,
            phase: request.body.phase
        };
        if (notification.iface === config.wired_interface || notification.iface === config.wifi_interface) {

            logger.log('info', "Network up/down notification: ", notification);
                
            switch (notification.phase) {
                case "pre-up":
                    break;
                case "post-up":
                    // Query IP address of interface after it's been brought up.
                    networkManager.GetNetworkState(function(state) {
                        if(notification.iface === config.wifi_interface) {
                            networkState.wifiInfo = state.wifiInfo;
                        } else {
                            networkState.wiredInfo = state.wiredInfo;
                        }
                        var isConnected = (networkState.wiredInfo !== null || networkState.wifiInfo !== null);
                        if (isConnected) {
                            //clears the pendingConnectionTimer so waitFinished() will not be called
                            if(pendingConnectionTimer){
                                clearTimeout(pendingConnectionTimer);
                                pendingConnectionTimer = null;
                            }
                            // Ignore up/down events on wifi interface when we are reconfiguring it.
                            if(!((notification.iface === config.wifi_interface) && configuringWifi)) {
                                logger.log("info", "Emitting 'netup' message to each websocket connection.");
                                ionsp.emit('netup');
                            }
                        }
                        // Always notify client of any network change, wireless interface or wired interface
                        ionsp.emit('netchange', networkState);
                    });
                    break;
                case "pre-down":
                    if(notification.iface === config.wifi_interface) {
                        networkState.wifiInfo = null;
                    } else if(notification.iface === config.wired_interface) {
                        networkState.wiredInfo = null;
                    }
                    var isConnected = (networkState.wiredInfo !== null || networkState.wifiInfo !== null);
                    if(!isConnected) {
                        // Ignore up/down events on wifi interface when we are reconfiguring it.
                        if(!((notification.iface === config.wifi_interface) && configuringWifi)) {
                            logger.log("info", "Emitting 'netdown' message to each websocket connection.");
                            ionsp.emit('netdown');
                        }
                    }
                    // Always notify client of any network change, wireless interface or wired interface
                    ionsp.emit('netchange', networkState);
                    break;
                case "post-down":
                    break;
            };
        }
        response.sendStatus(200);
    });


    // Respond to form post from captive portal page.
    // URL-encoded POST body should contain ESSID and passphrase
    // The server will attempt to connect to the specified WiFi access point
    app.post("/", function(request, response) {
        var wifiCredentials = {
            wifi_ssid:      request.body.wifi_ssid,
            wifi_passcode:  request.body.wifi_passcode,
        };

        if(configuringWifi) {
            response.sendStatus(500);
        } else {
 
            // This flag disables netup/netdown messages during wifi configuration
            configuringWifi = true; 

            // Issue 'pending' status update via websocket to client
            // In future, this could be a progress bar consisting of multiple progress messages
            // parsed from the configuration script's stdout.
            ionsp.emit('pending');

            networkManager.ConfigureWifi(wifiCredentials, function(error) {
                
                configuringWifi = false;

                var isConnected = (networkState.wiredInfo !== null || networkState.wifiInfo !== null);
                if(isConnected) {
                    logger.log("info", "Wifi successfully enabled!");
                    //ionsp.emit('netup', { ip_addr: state.wifiInfo.ip_addr, ssid: wifiCredentials.wifi_ssid });
                    if(error) {
                        response.render("captiveportal-unsuccessful", {ssid: wifiCredentials.wifi_ssid});
                    } else {
                        response.render("captiveportalconnected", {ssid: wifiCredentials.wifi_ssid});
                    }
                } else {
                    logger.log("info", "Failed to connect to wifi");
                    // Transition from 'pending' state.
                    //ionsp.emit('netdown');
                    // Redirect captive portal page to try again...
                    response.render("captiveportal-unsuccessful", {ssid: wifiCredentials.wifi_ssid});
                }
            });
        }
    });

    // Serves main 'TV device' page
    app.get("/device", function(request, response) {

        var launchUrl = adminConfig.launchUrl + '?';
        //launchUrl += 'bypassGateway=' + adminConfig.bypassGateway + "&";
        launchUrl += 'serverEnv=' + adminConfig.serverEnv; // Selected server env preset chosen in admin panel
        launchUrl += '&presetsUrl=' + adminConfig.presetsUrl; // Presets url containing all urls for all server env presets
        logger.log('info','Firmware CDN launch URL: ' + launchUrl);

        if(pendingConnectionTimer){
            response.render("device", { netstate: "pending", launchUrl: launchUrl });
        }
        else{
            // Paramterise the rendered HTML response by network connectivity status
            var isConnected = (networkState.wiredInfo !== null || networkState.wifiInfo !== null);
            var netState = isConnected ? "netup" : "netdown";
            response.render("device", { netstate: netState, launchUrl: launchUrl });
            response.end();
        }
    });

    // Send initial netup/netdown status when TV HTML page first connects
    ionsp.on('connection', function(socket) {
        logger.log("info", 'Device subscribed to notification channel.');

        socket.emit('apName', adminConfig.friendlyName);
        /*networkManager.GetAccessPointName(function(ApName){
            socket.emit('apName', ApName);
        });*/

        socket.emit('netchange', networkState);
        var isConnected = (networkState.wiredInfo !== null || networkState.wifiInfo !== null);
        if(isConnected) {
            socket.emit(pendingConnectionTimer ? 'pending' : 'netup');
        } else {
            socket.emit(pendingConnectionTimer ? 'pending' : 'netdown');
        }
    });

    server.listen(config.server.port, function() {
        
        iwlistTimeout();

        networkManager.Configure(function(error) {
            if(error) {
                logger.log("error", "Failed to configure network manager: ", error);
                process.exit(1);
            }
            else{
                // Ascertain the initial state of the network interfaces.
                // ifup/ifdown scripts help this server track the state if it changes.
                // This is better than evaluating the state using GetNetworkState()
                // which relies on 'ifconfig' because 'ifconfig' doesn't always 
                // report up to date information. For example, it is slow to stop
                // reporting an IP addresses when the network interfaces are disconnected.
                networkManager.GetNetworkState(function(state) {
                    networkState = state;
                    var isConnected = (networkState.wiredInfo !== null || networkState.wifiInfo !== null);

                    // Gives the device a set number of seconds to find a connection
                    // If no connection is found, a new setup is assumed
                    if(!isConnected) {
                        pendingConnectionTimer = setTimeout(function(){
                            pendingConnectionTimer = null; 
                            ionsp.emit('netdown');
                        }, 15000);
                    }
                });      
            }
        });

        logger.log("info",'Listening on port %d', server.address().port);
        logger.log("info","Serving from '" + webroot + "'.");
        logger.log("info",startupMsg);
    });
}

function initAdminConfig(networkManager, callback) {
    // Read TV Emulator configuraion file.
    fs.readFile(adminConfigFilename, function read(err, data) {
        if(err) {
            logger.log("error", err.message);
        } else {
            // Value set when the 2immerse-firmware is first installed
            var friendlyNameUninitialised = "<X_FriendlyName_X>";
            try {
                var adminConfig = (!err) ? JSON.parse(data) : {
                    "serverEnv": "production",
                    "launchUrl": "https://origin.platform.2immerse.eu/unified-launcher/www/launcher.html",
                    "presetsUrl": "https://origin.platform.2immerse.eu/unified-launcher/service-presets.json",
        //            "showMousePointer": "false",
                    "gateway":"192.168.10.1",
                    "cidr":"24",
                    "subnet":"192.168.10.0",
                    "dhcpStart":"192.168.10.50",
                    "dhcpEnd":"192.168.10.250",
                    "dhcpLease":"8h",
                    "friendlyName": friendlyNameUninitialised,
                    "wifiChannel": "6"
                };

                if(adminConfig.friendlyName === friendlyNameUninitialised) {
                    // Get default friendly name based on MAC address.
                    networkManager.GetAccessPointName(function(friendlyName) {
                        adminConfig.friendlyName = friendlyName;
                        callback(adminConfig);
                    });
                } else {
                    callback(adminConfig);
                }
            } catch(err) {
                logger.log("error", err.message);
            }
        }
    });
}

function serve(webroot, options) {
    var networkManager = require("./wifi-manager")(config, options.mockNetwork);
    initAdminConfig(networkManager, function(adminConfig) {
        // Server listens for ifupdown hooks, so needs starting first.
        initServer(webroot, networkManager, options, adminConfig);
    });
}

module.exports.serve = serve;
