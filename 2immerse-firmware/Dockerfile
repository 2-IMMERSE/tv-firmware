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

ENV OUTPUT="/src" LANG=C.UTF-8

ENV PATH="${PATH}:~/.local/bin"

RUN mkdir -p $OUTPUT

RUN apt-get update \
    && apt-get -yq --no-install-recommends install gnupg git ssh curl lintian build-essential devscripts debhelper \
    python-pip python-wheel python-setuptools ssh \
    && curl -sL https://deb.nodesource.com/setup_6.x | bash - \
    && apt-get install nodejs \
    && apt-get clean \
    && pip install awscli

RUN ssh-keyscan -H github.com > /etc/ssh/ssh_known_hosts

WORKDIR ${OUTPUT} 
VOLUME ${OUTPUT}
