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

clean-js-bundle = rm -f bundle.js bundle.js.map

BIN = $(realpath ../node_modules/.bin)
IMAGES = $(wildcard images/*)
DIST_IMAGES = $(addprefix $(BUILD_DIR)/,$(IMAGES))
FONTS = $(wildcard fonts/*)
DIST_FONTS = $(addprefix $(BUILD_DIR)/,$(FONTS))

.PHONY: all lint clean

#all: $(BUILD_DIR)/device.html
all: $(BUILD_DIR)/css/device.min.css $(BUILD_DIR)/css/device.min.css.map
all: $(BUILD_DIR)/js/device.min.js $(BUILD_DIR)/js/device.min.js.map
all: $(DIST_IMAGES)
all: $(DIST_FONTS)
all: Makefile

$(BUILD_DIR)/js/device.min.js $(BUILD_DIR)/js/device.min.js.map: $(wildcard js/*.js)

# Run the recipe for dummy.intermediate if either target is missing
$(BUILD_DIR)/js/device.min.js $(BUILD_DIR)/js/device.min.js.map: jsdummy.device.intermediate

# Make doesn't have an intuitive way to handle multiple targets
# Stack overflow has a solution:
# http://stackoverflow.com/questions/2973445/gnu-makefile-rule-generating-a-few-targets-from-a-single-source-file
# Targets that .INTERMEDIATE depends on are treated as intermediate files.
# This tells make that dummy.device.intermediate won't exist when make is run
# but its absence won't cause the recipe to be run spuriously.
.INTERMEDIATE: jsdummy.device.intermediate
jsdummy.device.intermediate: | $(BUILD_DIR)/js
	"$(BIN)/browserify" js/device.js --debug -t [ babelify --presets [es2015] ] | \
	"$(BIN)/exorcist" bundle.js.map > bundle.js
	"$(BIN)/uglifyjs" bundle.js --in-source-map bundle.js.map --source-map $(BUILD_DIR)/js/device.min.js.map \
	--source-map-url device.min.js.map -o $(BUILD_DIR)/js/device.min.js -c
	$(clean-js-bundle)


$(BUILD_DIR)/css/device.min.css $(BUILD_DIR)/css/device.min.css.map: $(wildcard css/*.scss)
$(BUILD_DIR)/css/device.min.css $(BUILD_DIR)/css/device.min.css.map: cssdummy.device.intermediate

.INTERMEDIATE: cssdummy.device.intermediate
cssdummy.device.intermediate: | $(BUILD_DIR)/css
	"$(BIN)/node-sass" --source-map=$(BUILD_DIR)/css/device.min.css.map --output-style=compressed \
	css/device.scss $(BUILD_DIR)/css/device.min.css

#$(BUILD_DIR)/%.html: %.html | $(BUILD_DIR)
#	cp -f $< $@

$(BUILD_DIR)/fonts/%: fonts/% | $(BUILD_DIR)/fonts
	cp -f $< $@

clean:
	$(clean-js-bundle)
	rm -fr $(BUILD_DIR)

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

$(BUILD_DIR)/js:
	mkdir -p $(BUILD_DIR)/js

$(BUILD_DIR)/css:
	mkdir -p $(BUILD_DIR)/css

$(BUILD_DIR)/images:
	mkdir -p $(BUILD_DIR)/images

$(BUILD_DIR)/fonts:
	mkdir -p $(BUILD_DIR)/fonts

$(BUILD_DIR)/images/%: images/% | $(BUILD_DIR) $(BUILD_DIR)/images
	mkdir -p $(dir $@)
	cp -f $< $@

lint:
	"$(BIN)/eslint" $(wildcard js/*.js)
	"$(BIN)/sass-lint" css/*.scss
