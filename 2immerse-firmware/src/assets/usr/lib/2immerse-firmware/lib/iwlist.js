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


var exec    = require("child_process").exec;

/*****************************************************************************\
    Return a function which is responsible for using "iwlist scan" to figure
    out the list of visible SSIDs along with their RSSI (and other info)
\*****************************************************************************/
// iwlist returns results of the form:
//
//  var iwList = {
//    interface: "wlan0",
//    scan_results: [
//        { ssid: "WifiB", address: "...", "signal_strength": 57 },
//        { ssid: "WifiA", address: "...", "signal_strength": 35 },
//    ]
//  };
module.exports = function(callback, wifiDevice, mockNetwork) {

    var fields_to_extract = {
        "ssid":            /ESSID:\"(.*)\"/,
        "quality":         /Quality=(\d+)\/\d+/,
        "signal_strength": /.*Signal level=-(\d+)/,
        "encrypted":       /Encryption key:(on)/,
        "open":            /Encryption key:(off)/,
    };

    var cmd = (mockNetwork) ? "iwlist-mock" : "iwlist";
    exec(cmd + " " + wifiDevice + " scan", function(error, stdout, stderr) {

        /* The output structure looks like this:
        [
            {
                interface: "wlan0",
                scan_results: [
                    { ssid: "WifiB", address: "...", "signal_strength": 57 },
                    { ssid: "WifiA", address: "...", "signal_strength": 35 }
                ]
            },
            ...
        ] */
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

}
