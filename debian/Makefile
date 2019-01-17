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

DOCKER_IMAGE := bbcrd-debian-builder
DOCKERFILE := Dockerfile
CURL:= curl --output
#CURL:= wget --output-document
FIRMWARE_VERSION=$(shell git rev-parse --short HEAD)
RUN_PROXY=--env FIRMWARE_VERSION=$(FIRMWARE_VERSION)

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
	RUN_PROXY += --env http_proxy=$(http_proxy)
endif

ifdef https_proxy
	BUILD_PROXY += --build-arg https_proxy=$(https_proxy)
	RUN_PROXY += --env https_proxy=$(https_proxy)
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

.PHONY: all clean dockerimage iso deploy shell

all: Makefile dockerimage iso

dockerimage: $(DOCKERFILE)
	docker build  $(BUILD_PROXY) -f $(DOCKERFILE) -t $(DOCKER_IMAGE) .

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR) && chmod 777 $(BUILD_DIR)

# Creation of block devices (A.K.A 'loop' devices) to host a filesystem within an image file
# requires the --privilege=true flag. See https://github.com/moby/moby/issues/27886 for an explanation. 
iso: dockerimage 
	docker run $(RUN_PROXY) --rm -it \
	--privileged=true \
	--cap-add CAP_MKNOD \
	-v $(abspath $(BUILD_DIR)):/build $(DOCKER_IMAGE) \
	build.sh

# Invoke 'make shell' for debugging the docker container
shell: dockerimage | $(BUILD_DIR)
	docker run $(RUN_PROXY) --rm -it \
	--privileged=true \
	--cap-add CAP_MKNOD \
	-v $(abspath $(BUILD_DIR)):/build $(DOCKER_IMAGE) \
	/bin/bash

deploy:
	echo $(BUILD_DIR)
	docker run $(RUN_PROXY) --rm -it \
	--privileged=true \
	-v $(abspath $(BUILD_DIR)):/build \
	--env AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID) \
	--env AWS_SECRET_ACCESS_KEY=$(AWS_SECRET_ACCESS_KEY) \
	$(DOCKER_IMAGE) \
	aws s3 cp /build/live-image-amd64.hybrid.iso s3://origin.platform.2immerse.eu/firmware/2immerse-firmware-$(FIRMWARE_VERSION).hybrid.iso

clean:
	docker rmi $(DOCKER_IMAGE)
ifndef WORKING_DIR
	rm -fr $(BUILD_DIR)
endif
