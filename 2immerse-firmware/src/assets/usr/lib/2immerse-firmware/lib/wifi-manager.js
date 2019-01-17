// Originally based on raspberry-wifi-conf
// See: LICENSE.raspberry-wifi-conf
//
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

var execFile    = require("child_process").execFile;

module.exports = function(config, mockNetwork) {
    
    var networkCommand = function(cmd, args, callback) {
        // Mock network tools for testing
        var cmd = (mockNetwork) ? "mock-" + cmd : cmd;
        if(typeof args === 'function') {
            callback = args;
            return execFile(cmd, callback);
        } else {
            return execFile(cmd, args, callback);
        }
    };

    // Merge members of obj into 'result'
    var merge = function(result, obj) {
        for (key in obj) {
            result[key] = obj[key];
        }
    };

    // Patterns to extract fields from output of 'ifconfig'
    var ifconfigFields = {
        "hw_addr":         /ether\s([^\s]+)/,
        "inet_addr":       /inet\s([^\s]+)/,
    };

    // Patterns to extract fields from output of 'iwconfig'
    var iwconfigFields = {
        "ap_addr":         /Access Point:\s([^\s]+)/,
        "ap_ssid":         /ESSID:\"([^\"]+)\"/,
        "unassociated":    /(unassociated)\s+Nick/,
    };

    // Parse shell command using regular expressions defined in 'fields'
    var parseShellCommand = function(cmd, args, fields, callback) {
        networkCommand(cmd, args, function(error, stdout, stderr) {
            var output = {};
            if (!error) { 
                for (var key in fields) {
                    re = stdout.match(fields[key]);
                    if (re && re.length > 1) {
                        output[key] = re[1];
                    }
                }
            }
            callback(output);
        });
    };

    var getLogicalDeviceNames = function(callback) {
        var names = {};
        // On initilisation, determine network device names 
        networkCommand("eth-device", function(error, stdout, stderr) {
            var re = stdout.match(/((en|eth)[A-Za-z0-9]+)/g);
            if(re && re.length > 0) {
                names.wired_interface = re.sort()[0];
            }
            networkCommand("wifi-device", function(error, stdout, stderr) {
                var re = stdout.replace(/wlpap0/g, '').match(/(wl[A-Za-z0-9]+)/g);
                if(re && re.length > 0) {
                    names.wifi_interface = re.sort()[0];
                }
                callback(names);
            });
        });
    };

    var apName = null;
    var getAccessPointName = function(callback){
        if(apName === null){
            networkCommand("ap-name", function(error, stdout, stderr){
                callback(stdout);
            });
        } else {
            callback(apName);
        }

    };
    
    var getWiredState = function(callback) {
        if(typeof config.wired_interface === 'undefined') {
            return callback(null);
        } else {
            parseShellCommand("ifconfig", [config.wired_interface], ifconfigFields, function(info) {
                return callback((typeof info.inet_addr === 'undefined') ? null : { ip_addr: info.inet_addr, connection_type : "wired" });
            });
        }
    };

    var getWifiState = function(callback) {
        if(typeof config.wifi_interface === 'undefined') {
            return callback(null);
        } else {
            parseShellCommand("ifconfig", [config.wifi_interface], ifconfigFields, function(info) {
                return callback((typeof info.inet_addr === 'undefined') ? null : { ip_addr: info.inet_addr, connection_type : "wireless" });
            });
        }
    };

    // Do we have a wired or wifi connection?
    var isConnected = function(callback) {
        getWiredState(function(info) {
            if(info) {
                callback(info);
            } else {
                getWifiState(function(info) {
                    callback(info);
                });
            }
        });        
    };

    var getNetworkState = function(callback) {
        getWiredState(function(wiredInfo) {
            getWifiState(function(wifiInfo) {
                callback({ wiredInfo: wiredInfo, wifiInfo: wifiInfo });
            });
        });        
    };

    var configure = function(callback) {
        console.log("configuring");

        getLogicalDeviceNames(function(names) {
            if(names.wired_interface || names.wifi_interface) {
                config.wifi_interface = names.wifi_interface;
                config.wired_interface = names.wired_interface;
                callback();
            } else {
                callback(new Error("No Available network devices."));
            }
        });
    };

    var configureWifi = function(wifiCredentials, callback) {
        if(typeof config.wifi_interface === 'undefined') {
            return callback(null);
        } else {
            networkCommand('configure-wifi', [wifiCredentials.wifi_ssid, wifiCredentials.wifi_passcode, config.wifi_interface], function(error, stdout, stderr) {
                callback(error);
            });
        }
    };

    var configureAccessPoint = function(bcast_ssid, callback) {
        if(typeof config.wifi_interface === 'undefined') {
            return callback(null);
        } else {
            networkCommand('configure-ap', [bcast_ssid, config.wifi_interface], function(error, stdout, stderr) {
                callback(error)
            });
        }
    };

    // Return a function which is responsible for using "iwlist scan" to figure
    // out the list of visible SSIDs along with their RSSI (and other info)
    // iwlist returns results of the form:
    //
    //  var iwList = {
    //    interface: "wlan0",
    //    scan_results: [
    //        { ssid: "WifiB", address: "...", "signal_strength": 57 },
    //        { ssid: "WifiA", address: "...", "signal_strength": 35 },
    //    ]
    //  };
    var iwList = function(callback) {
        var fields_to_extract = {
            "ssid":            /ESSID:\"(.*)\"/,
            "quality":         /Quality=(\d+)\/\d+/,
            "signal_strength": /.*Signal level=-(\d+)/,
            "encrypted":       /Encryption key:(on)/,
            "open":            /Encryption key:(off)/,
        };

        networkCommand("iwlist", [config.wifi_interface, "scan"], function(error, stdout, stderr) {

            var output          = [],
                interface_entry = null,
                current_cell    = null;

            // Handle errors from running "iwlist scan"
            if (error) {
                return callback(error, output)
            }

            function append_previous_cell() {
                if (current_cell != null && interface_entry != null) {
                    if (typeof(current_cell["ssid"]) != "undefined" &&
                        current_cell["ssid"] != "" ) {
                        interface_entry["scan_results"].push(current_cell);
                    }
                    current_cell = null;
                }
            }

            function append_previous_interface() {
                append_previous_cell();
                if (interface_entry != null) {
                    output.push(interface_entry);
                    interface_entry = null;
                }
            }

            // Parse the result, build return object
            lines = stdout.split("\n");
            for (var idx in lines) {
                line = lines[idx].trim();

                // Detect new interface
                var re_new_interface = line.match(/([^\s]+)\s+Scan completed :/);
                if (re_new_interface) {
                    append_previous_interface();
                    interface_entry = {
                        "interface":    re_new_interface[1],
                        "scan_results": []
                    };
                    continue;
                }

                // Detect new cell
                var re_new_cell = line.match(/Cell ([0-9]+) - Address: (.*)/);
                if (re_new_cell) {
                    append_previous_cell();
                    current_cell = {
                        "cell_id": parseInt(re_new_cell[1]),
                        "address": re_new_cell[2],
                    };
                    continue;
                }

                // Handle other fields we want to extract
                for (var key in fields_to_extract) {
                    var match = line.match(fields_to_extract[key]);
                    if (match) {
                        current_cell[key] = match[1];
                    }
                }
            }

            // Add the last item we tracked
            append_previous_interface();

            return callback(null, output);
        });
    };

    return {
        Configure:               configure, 
        IwList:                  iwList,
        IsConnected:             isConnected,
        GetNetworkState:         getNetworkState,
        ConfigureWifi:           configureWifi,
        ConfigureAccessPoint:    configureAccessPoint,
        GetAccessPointName:      getAccessPointName,
    };
}
