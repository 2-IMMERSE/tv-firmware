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
    window.jQuery = window.$ = require('./jquery.min.js');
    require('bootstrap');
} catch(e) {
}

var processListUpdates = true;

var passwordOkayBtn = document.getElementById('passwordOkayBtn');
passwordOkayBtn.addEventListener('click', function() {

	processListUpdates = false;

    // Sumit password/ssid
    var passwordModal = document.getElementById('passwordModal');
    $(passwordModal).modal('hide');
    
    document.getElementById("title-text").textContent = "Configuring TV's WiFi...";

    //show spinner
    document.getElementById("accessPointGroup").innerHTML = '<li class="list-group-item safari-list-group-item list-group-item-action d-flex flex-nowrap justify-content-center"><img src="images/load.svg"><p>Connecting...</p></li>';
});

var accessPointGroup = document.getElementById('accessPointGroup');
accessPointGroup.addEventListener('click', function(event) {
    var ssidIdElem = document.getElementById('ssidId');
    ssidIdElem.textContent = event.target.dataset.ssid;
    var hiddenWifiSSIDElem = document.getElementById('wifi_ssid');
    hiddenWifiSSIDElem.value = event.target.dataset.ssid;
});

var showPasswordCheckBox = document.getElementById('showPasswordChk');
showPasswordCheckBox.addEventListener('click', function(event) {
    var passwordInput = document.getElementById('passwordInput');
    passwordInput.type = (showPasswordCheckBox.checked) ? "text" : "password";
    document.getElementById("passwordInput").focus();
});

//clears password box when modal box is opened
$('#passwordModal').on('show.bs.modal', function () {
    var passwordInput = document.getElementById('passwordInput');
    passwordInput.value = "";
});

$('#passwordModal').on('shown.bs.modal', function () {
    document.getElementById("passwordInput").focus();
});

function populateAccessPointList() {
	// Populate initial list of WiFi access points.
	var iwlistRequest = new XMLHttpRequest();
	iwlistRequest.onreadystatechange = function(){
	    if(this.readyState == 4) {
	    	if(this.status == 200 && processListUpdates) {
		        document.getElementById("title-text").textContent = "Choose Wi-Fi Network";
		        document.getElementById("accessPointGroup").innerHTML = this.response;
	    	}
    		window.setTimeout(populateAccessPointList, 3000);
	    }
	}
	iwlistRequest.open("GET", "/iwlist", true);
	iwlistRequest.send();
}

populateAccessPointList();
