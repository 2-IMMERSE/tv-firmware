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

FROM debian:latest

ENV OUTPUT="/build" LANG=C.UTF-8

RUN mkdir -p $OUTPUT

RUN apt-get update \
    && apt-get -yq --no-install-recommends install live-build live-boot dirmngr gpg python-pip python-setuptools python-wheel \
    && apt-get clean \ 
    && pip install awscli

COPY bin/* /usr/bin/
COPY config/* /usr/src/

WORKDIR ~/ 
VOLUME ${OUTPUT}

