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

SRC_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))src

# If no make target is specified, ensure 'MAKECMDGOALS' contains 'all'
# to keep the ENV var checking below happy.
ifeq ($(strip $(MAKECMDGOALS)),)
	MAKECMDGOALS := all
endif

ifdef WORKING_DIR
	BUILD_DIR := $(WORKING_DIR)
else
	BUILD_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))build
endif

ifdef http_proxy
	BUILD_PROXY = --build-arg http_proxy=$(http_proxy)
	RUN_PROXY = --env http_proxy=$(http_proxy)
endif

ifdef https_proxy
	BUILD_PROXY += --build-arg https_proxy=$(https_proxy)
	RUN_PROXY += --env https_proxy=$(https_proxy)
endif

ifndef DOCKER_IMAGE_NAME
	DOCKER_IMAGE_NAME := bbcrd-firmware-builder
endif

# Check that private key file actually exists.
ifdef PRIVATE_KEY_FILENAME
    ifeq ("$(wildcard $(PRIVATE_KEY_FILENAME))","")
        $(error '$(PRIVATE_KEY_FILENAME)' doesn't exist)
    endif
else
    # PRIVATE_KEY_FILENAME must be defined for the 'shell', 'firmware' and 'all' targets
    ifneq ($(filter shell all firmware,$(MAKECMDGOALS)),)
        $(error 'PRIVATE_KEY_FILENAME' environment variable is required by the 'shell', firmware' and 'all' make targets)
    endif
endif

ifndef AWS_ACCESS_KEY_ID
    # AWS_ACCESS_KEY_ID must be defined for the 'deploy' target
    ifneq ($(filter deploy,$(MAKECMDGOALS)),)
        $(error 'AWS_ACCESS_KEY_ID' environment variable is required by the 'deploy' make target)
    endif
endif

ifndef AWS_SECRET_ACCESS_KEY
    # AWS_SECRET_ACCESS_KEY must be defined for the 'deploy' target
    ifneq ($(filter deploy,$(MAKECMDGOALS)),)
        $(error 'AWS_SECRET_ACCESS_KEY' environment variable is required by the 'deploy' make target)
    endif
endif

ifdef SERVER_ENV
	ifeq ($(filter prod test edge football,$(SERVER_ENV)),)
        $(error 'SERVER_ENV' environment variable must be set to 'prod', 'edge', 'football' or 'test')
	endif
else
	ifneq ($(filter deploy,$(MAKECMDGOALS)),)
        $(error 'SERVER_ENV' environment variable is required by the 'deploy' make target)
	endif
endif

.PHONY: all lint clean info deploy dockerimage firmware www firmware-server run-dev-server shell

all: Makefile dockerimage firmware

info:
	@echo "2-Immerse Firmware Builder"
	@echo "-------------------------"
	@echo "Makefile targets:"
	@echo "  all                 Builds a debian package of the firmware."
	@echo "  dockerimage         Just builds the docker image used for building the firmware"
	@echo "  lint                Runs eslint, lintian, sasslint etc."
	@echo "  firmware-server     Just builds the firmware's internal web server"
	@echo "  www                 Just builds the local website content used by the firmware's web server"
	@echo "  run-dev-server      Runs a local 'development' instance of the firmware's web server (port 3000)"
	@echo "  shell               Launches a bash session hosted by the docker container for debugging"
	@echo "  clean               Deletes the docker image and all build artefacts"
	@echo ""
	@echo "Environment variables:"
	@echo "  PRIVATE_KEY_FILENAME  (Required) Filename of private RSA key for github"
	@echo "  BUILD_DIR             (Optional) Directory to store build artefacts. Defaults to CWD."
	@echo "  AWS_ACCESS_KEY_ID     (Required by deploy target) Amazon Web Services access key ID"
	@echo "  AWS_SECRET_ACCESS_KEY (Required by deploy target) Amazon Web Services secret access key"
	@echo "  SERVER_ENV            (Required by deploy target) Server env (e.g. prod, edge or test"
	@echo "  DOCKER_IMAGE_NAME     (Optional) Name to use for docker image for building firmware"
	@echo ""
	@echo "Example:"
	@echo ""
	@echo "  make PRIVATE_KEY_FILENAME=~/.ssh/id_rsa all"

dockerimage: Dockerfile | $(BUILD_DIR)
	docker build $(BUILD_PROXY) -t $(DOCKER_IMAGE_NAME) .

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

firmware: dockerimage
	docker run $(RUN_PROXY) --rm -t \
	-v $(SRC_DIR):/src \
	-v $(BUILD_DIR):/build \
	-v $(PRIVATE_KEY_FILENAME):/root/.git-key:ro \
	$(DOCKER_IMAGE_NAME) make -C /src BUILD_DIR=/build all

#	--privileged \
#	-v /var/run/docker.sock:/var/run/docker.sock \

# Inclusion of this rule allows the web server used by the firmware to be built on its own.
firmware-server: dockerimage
	docker run $(RUN_PROXY) --rm -t \
	-v $(SRC_DIR):/src \
	-v $(BUILD_DIR):/build \
	$(DOCKER_IMAGE_NAME) make -C /src BUILD_DIR=/build firmware-server

# Inclusion of this rule allows the web content used by the firmware server to be built on its own.
www: dockerimage
	docker run $(RUN_PROXY) --rm -t \
	-v $(SRC_DIR):/src \
	-v $(BUILD_DIR):/build \
	$(DOCKER_IMAGE_NAME) make -C /src BUILD_DIR=/build www

run-dev-server: dockerimage firmware-server
	docker run $(RUN_PROXY) --rm -it \
	-p 3000:3000 \
	-v $(SRC_DIR):/src \
	-v $(BUILD_DIR):/build \
	$(DOCKER_IMAGE_NAME) make -C /src BUILD_DIR=/build run-dev-server

# Invoke 'make shell' for debugging the docker container
shell: | $(BUILD_DIR)
	docker run $(RUN_PROXY) --rm -it \
	--env AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID) \
	--env AWS_SECRET_ACCESS_KEY=$(AWS_SECRET_ACCESS_KEY) \
	-v $(SRC_DIR):/src \
	-v $(BUILD_DIR):/build \
	-v $(PRIVATE_KEY_FILENAME):/root/.git-key:ro \
	$(DOCKER_IMAGE_NAME) bash

lint:
	docker run $(RUN_PROXY) --rm -t \
	-v $(SRC_DIR):/src -v $(BUILD_DIR):/build $(DOCKER_IMAGE_NAME) make -C /src BUILD_DIR=/build lint

clean:
	docker run $(RUN_PROXY) --rm -t \
	-v $(SRC_DIR):/src -v $(BUILD_DIR):/build $(DOCKER_IMAGE_NAME) make -C /src BUILD_DIR=/build clean
	docker rmi $(DOCKER_IMAGE_NAME)
ifndef WORKING_DIR
	rm -fr $(BUILD_DIR)
endif
