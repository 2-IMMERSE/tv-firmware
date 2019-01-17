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

var minimist = require('minimist'),
    async    = require("async"),
    path     = require("path"),
    fs       = require("fs"),
    portal   = require('./lib/portal');

function printUsage() {
    console.log('usage: node index.js [-m] webroot');
    console.log('example:  node index.js www-dir');
    console.log('   -m,--mock       mock wireless network interface for testing purposes');
    console.log('   -s,--https      use https server and wss connections');
    console.log('   webroot         root file serving directory');
}

var argv = minimist(process.argv.slice(2), { 
    boolean: ['https', 'mock'],
    alias: { s: 'https', m: 'mock'}
});

var webRoot = argv._[0];
if(!webRoot) {
   printUsage();
} else {

    var options = {
        https: argv.https, 
        mockNetwork: argv.mock
    };

    if(argv.https) {
        options.certs = {
            key: fs.readFileSync(path.resolve(__dirname, './certs/server.pem')),
            cert: fs.readFileSync(path.resolve(__dirname, './certs/server.crt')),
        };
    }

    portal.serve(webRoot, options);
}
