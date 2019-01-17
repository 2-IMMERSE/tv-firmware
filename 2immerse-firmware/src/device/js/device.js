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

try {
    require('bootstrap');
} catch (e) {}

import NotificationClient from "./notification-client.js";

let config = {
    host: location.hostname,
    port: 3000,
    path: '/', // location on the website where REST API is hosted/mounted
    secure: false, // Requires https?
};

let notificationClient = new NotificationClient(config);

notificationClient.on('connection', function(peerId) {
    console.log('Connected.');
});

notificationClient.on('disconnect', function() {
    console.log('Disconnected.');
});

notificationClient.on('pending', function(connectionInfo) {
    var bodyElem = document.getElementsByTagName('body')[0];
    bodyElem.dataset.state = "pending";
});

notificationClient.on('netup', function() {
    if(typeof firmwareLaunchUrl !== 'undefined' && firmwareLaunchUrl) {
        location.href = firmwareLaunchUrl;
    } else {
        // Sensible default
        //location.href = "https://origin.platform.2immerse.eu/dmapps/motogp/launcher/launch-tv.html";
        location.href = "https://origin.platform.2immerse.eu/firmware/launcher/launcher.html";
        //location.href = "http://localhost:3000/cdn/launcher.html";
    }
});

notificationClient.on('netdown', function() {
    var bodyElem = document.getElementsByTagName('body')[0];
    bodyElem.dataset.state = "netdown";
});

notificationClient.on('href', function(url) {
    location.href = url;
});

notificationClient.on('error', (err) => {
    console.log('Error: ', err);
});

notificationClient.on('apName', function(ApName) {
    document.getElementById("instructionOne").innerHTML = 'Use your mobile device to connect to the <b>'+ApName+'</b> Wi-Fi network.';
    //document.getElementById("wifi-network").textContent = ApName;
});

function signalStrengthIndicator(db){

    if(db <= 67){
        return "src", "images/wifi.svg";
    } else if (db <= 70){
        return "src", "images/wifi-medium.svg";
    } else {
        return "src", "images/wifi-low.svg";
    }
    console.log(db);
    //document.getElementById(ssid).innerHTML ="<img class='signal-indicator' src='images/wifi-off.svg'>";
}

//sets the time
updateTime();
window.setInterval(function(){
    updateTime();
},1000);

function updateTime(){
    var date = new Date();
    if(date.getMonth().toString().length + 1 == 1){
        var dateString = date.getDate() + "/0" + (date.getMonth()+1) + "/" + date.getFullYear();
    } else{
        var dateString = date.getDate() + "/" + (date.getMonth()+1) + "/" + date.getFullYear();
    }
    
    if(date.getMinutes().toString().length === 1){
        var time = date.getHours() + ":0" + date.getMinutes();
    } else{
        var time = date.getHours() + ":" + date.getMinutes();
    }
    
    if(date.getSeconds().toString().length === 1){
        time = time + ":0" + date.getSeconds(); 
    } else {
        time = time + ":" + date.getSeconds(); 
    }
    
    var timeLabels = document.getElementsByClassName("time");
    for(var i = 0; i < timeLabels.length; i++){
        timeLabels[i].textContent = dateString + "  •  " + time + " ";
    }
}//fn update time
