/*
    Copyright 2019 British Broadcasting Corporation
    
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
    
      http://www.apache.org/licenses/LICENSE-2.0
    
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License. 
*/

let EventEmitter = require('eventemitter3'); //.EventEmitter;
let socketIoClient = require('socket.io-client');

// Custom error type
function NotificationClientError(message) {
    this.name = 'NotificationClientError';
    this.message = message || 'Default Message';
    this.stack = (new Error()).stack;
}
NotificationClientError.prototype = Object.create(Error.prototype);
NotificationClientError.prototype.constructor = NotificationClientError;

// socket.id on the client is different to socket.id on the server, the latter being prefixed with nsp.
// A pending fix will make the client consistent with the server.
//
// https://github.com/socketio/socket.io/issues/2405
function fixSocketId(socketId) {
    if(socketId.indexOf('/notify#') !== 0) {
        return '/notify#' + socketId;
    }
    return socketId;
}

function NotificationClient(options) {
    if (!(this instanceof NotificationClient)) {
        return new NotificationClient(options);
    }
    EventEmitter.call(this);

    let self = this;

    let protocol = options.secure ? 'https://' : 'http://';
    let port = options.port ? ':' + options.port : '';
    let url = protocol + options.host + port + options.path + 'notify';
    self._socket = socketIoClient.connect(url, { rejectUnauthorized: false /*, query: "lobbyId=" + lobbyId*/ });

    self._socket.on('connect', () => self.emit('connection', fixSocketId(self._socket.id)));
    self._socket.on('error', (err) => self.emit('error', err));
    self._socket.on('disconnect', () => self.emit('disconnect'));

    self._socket.on('pending', () => self.emit('pending'));
    self._socket.on('netup', () => self.emit('netup'));
    self._socket.on('netdown', () => self.emit('netdown'));
    self._socket.on('netchange', (state) => self.emit('netchange', state));
    self._socket.on('href', (url) => self.emit('href', url));
    
    self._socket.on('apName', (ApName) => self.emit('apName', ApName));    
}

// NotificationClient inherits EventEmitter
NotificationClient.prototype = new EventEmitter();

NotificationClient.prototype.IsConnected = function() {
    return (this._socket && this._socket.connected);
};

NotificationClient.prototype.Disconnect = function() {
    if(this._socket) {
        this._socket.close();
        this._socket = null;
    }
};

module.exports = NotificationClient;
