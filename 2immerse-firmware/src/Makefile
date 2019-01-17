# Copyright 2019 British Broadcasting Corporation
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# 
#   http://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

PACKAGE_NAME = 2immerse-firmware
PHONY_SRC_DIRS = captiveportal device
PHONY_CLEAN_DIRS = $(addprefix clean_,$(PHONY_SRC_DIRS))
PHONY_DEPLOY_DIRS = $(addprefix deploy_,$(PHONY_SRC_DIRS))
PHONY_LINT_DIRS = $(addprefix lint_,$(PHONY_SRC_DIRS))

PACKAGE_VERSION := 1.1-1
PACKAGE_DIR := $(BUILD_DIR)/$(PACKAGE_NAME)_$(PACKAGE_VERSION)_all
TARGET_DIR := $(PACKAGE_DIR)/usr/lib/2immerse-firmware
WEBROOT_DIR := $(TARGET_DIR)/www
WIDEVINE_DIR := $(PACKAGE_DIR)/usr/lib/chromium-browser
WIDEVINE_LIBS := $(WIDEVINE_DIR)/libwidevinecdm.so $(WIDEVINE_DIR)/libwidevinecdmadapter.so
CHROME_DIR := $(BUILD_DIR)/chrome

PRIVATE_KEY := /root/.git-key

# Sparse checkout of client-api repo to obtain the server-tvemu servers
HBBTV2_SERVER := $(BUILD_DIR)/hbbtv2-servers/server-tvemu
HBBTV2_REPO := git@github.com:2-IMMERSE/client-api.git
HBBTV2_REPO_BRANCH := master

# Sparce checkout of repo to obtain self-signed cert for standalone
# (locally hosted) 2-Immerse services
CERTS_REPO := git@github.com:2-IMMERSE/get-started.git
CERTS_REPO_BRANCH := master
CLIENT_CERT := $(BUILD_DIR)/get-started/standalone/client-certs/2immerseCA.pem
CA_CERTS_DIR := $(PACKAGE_DIR)/usr/share/ca-certificates

#------------------------------------------------------------------------------
# Build rules
#------------------------------------------------------------------------------

.PHONY: all clean lint deb-package www firmware-server build-deps run-dev-server widevine certs
.PHONY: $(PHONY_SRC_DIRS) $(PHONY_CLEAN_DIRS) $(PHONY_LINT_DIRS)

all: Makefile deb-package 

#server-tvemu: $(KNOWN_HOSTS)
server-tvemu: $(BUILD_DIR)/hbbtv2-servers
	cp -fr $(HBBTV2_SERVER)/ $(TARGET_DIR)/
	ssh-agent bash -c "ssh-add $(PRIVATE_KEY); npm install --only=production --prefix $(TARGET_DIR)/server-tvemu"

# Sparse checkout of server-tvemu directory from the client-api repository.
$(BUILD_DIR)/hbbtv2-servers:
	ssh-agent bash -c "ssh-add $(PRIVATE_KEY); git clone $(HBBTV2_REPO) \
	--depth 1 --branch $(HBBTV2_REPO_BRANCH) --single-branch --no-checkout $(BUILD_DIR)/hbbtv2-servers"
	echo "server-tvemu/*" > $(BUILD_DIR)/hbbtv2-servers/.git/info/sparse-checkout
	cd $(BUILD_DIR)/hbbtv2-servers && git config core.sparseCheckout true && git checkout $(HBBTV2_REPO_BRANCH)

pydvbcss:
	mkdir -p $(TARGET_DIR)/pypi
	pip download -d $(TARGET_DIR)/pypi 'pydvbcss==0.4.1'

widevine: $(WIDEVINE_LIBS)

$(WIDEVINE_LIBS): $(WIDEVINE_DIR) $(CHROME_DIR)/chrome.deb
	cd $(CHROME_DIR) && ar -x chrome.deb
	cd $(CHROME_DIR) && tar xvf $(CHROME_DIR)/data.tar.xz
	cp $(CHROME_DIR)/opt/google/chrome/libwidevinecdm* $(WIDEVINE_DIR)

$(WIDEVINE_DIR):
	mkdir -p $@

# TODO: There is a chrome-widevine debian package that contains the widevine shared
#       objects for a number of platforms. This rule is currently amd64 specific
$(CHROME_DIR)/chrome.deb:
	mkdir -p $(CHROME_DIR)
	curl https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb > $(CHROME_DIR)/chrome.deb

deb-package: firmware-server server-tvemu pydvbcss widevine certs
	cp -fr assets/* $(PACKAGE_DIR)/
	gzip -f -n --best $(PACKAGE_DIR)/usr/share/doc/2immerse-firmware/changelog.Debian
	dpkg-deb --build $(PACKAGE_DIR)

# TODO: This can be removed. It used to provide a self-signed cert for the firmware's webserver to use to enable https.
#       A cert is now provided in the 2IMMERSE/get-started repo
#CERTS_DIR := $(TARGET_DIR)/certs
#$(CERTS_DIR):
#	mkdir -p $@
#certs: $(CERTS_DIR)/server.crt $(CERTS_DIR)/server.pem
#$(CERTS_DIR)/server.crt $(CERTS_DIR)/server.pem: certificates.intermediate
#.INTERMEDIATE: certificates.intermediate
#certificates.intermediate: | $(CERTS_DIR)
#	openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:1024 -keyout $(CERTS_DIR)/private.key -out $(CERTS_DIR)/server.crt
#	cp $(CERTS_DIR)/private.key $(CERTS_DIR)/server.pem
#	cat $(CERTS_DIR)/server.crt >> $(CERTS_DIR)/server.pem
#	rm -f $(CERTS_DIR)/private.key

certs: $(CLIENT_CERT) | $(CA_CERTS_DIR)
	cp -f $(CLIENT_CERT) $(CA_CERTS_DIR)/2immerseCA.crt

# Sparse checkout of self-signed 2-IMMERSE certs for standalone (locally hosted) services
$(CLIENT_CERT):
	ssh-agent bash -c "ssh-add $(PRIVATE_KEY); git clone $(CERTS_REPO) \
	--depth 1 --branch $(CERTS_REPO_BRANCH) --single-branch --no-checkout $(BUILD_DIR)/get-started"
	echo "standalone/client-certs/*" > $(BUILD_DIR)/get-started/.git/info/sparse-checkout
	cd $(BUILD_DIR)/get-started && git config core.sparseCheckout true && git checkout $(CERTS_REPO_BRANCH)

firmware-server: www
	cp -fr assets/usr/lib/2immerse-firmware/index.js $(TARGET_DIR)/
	cp -fr assets/usr/lib/2immerse-firmware/lib $(TARGET_DIR)/
	cp -f package.json $(TARGET_DIR)
	npm install --only=production --prefix $(TARGET_DIR)
	rm -fr $(TARGET_DIR)/package.json

run-dev-server: firmware-server
	cp -f assets/usr/bin/mock-* /usr/bin/
	cp -f assets/var/lib/* /var/lib/
	cd $(TARGET_DIR) && /usr/bin/nodejs index.js -m $(WEBROOT_DIR)

www: $(PHONY_SRC_DIRS)
	cp -fr assets/usr/lib/2immerse-firmware/views $(TARGET_DIR)/

$(PHONY_SRC_DIRS): build-deps
	make -C $@ BUILD_DIR=$(WEBROOT_DIR)

build-deps: node_modules $(WEBROOT_DIR)

node_modules: package.json
	npm install --only=dev

$(WEBROOT_DIR):
	mkdir -p $@

$(CA_CERTS_DIR):
	mkdir -p $@

lint: $(PHONY_LINT_DIRS)

$(PHONY_LINT_DIRS): build-deps
	make -C $(subst lint_,,$@) lint BUILD_DIR=$(WEBROOT_DIR)
	lintian $(PACKAGE_DIR).deb

clean: $(PHONY_CLEAN_DIRS)
	rm -fr $(PACKAGE_DIR)

$(PHONY_CLEAN_DIRS):
	make -C $(subst clean_,,$@) clean BUILD_DIR=$(WEBROOT_DIR)

