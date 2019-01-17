# Makefile for building captive portal bundle

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
clean-css-bundle = rm -f cssbundle.css cssbundle.css.map

BIN = $(realpath ../node_modules/.bin)
IMAGES = $(shell find images -name "*.png")
DIST_IMAGES = $(addprefix $(BUILD_DIR)/,$(IMAGES))
#FONTS = $(wildcard fonts/*)
#DIST_FONTS = $(addprefix $(BUILD_DIR)/,$(FONTS))

.PHONY: all lint clean

#all: $(BUILD_DIR)/index.html
all: $(BUILD_DIR)/css/captiveportal.min.css $(BUILD_DIR)/css/captiveportal.min.css.map
all: $(BUILD_DIR)/js/captiveportal.min.js $(BUILD_DIR)/js/captiveportal.min.js.map
all: $(DIST_IMAGES)
#all: $(DIST_FONTS)
all: Makefile

$(BUILD_DIR)/js/captiveportal.min.js $(BUILD_DIR)/js/captiveportal.min.js.map: $(wildcard js/*.js)

# Run the recipe for dummy.intermediate if either target is missing
$(BUILD_DIR)/js/captiveportal.min.js $(BUILD_DIR)/js/captiveportal.min.js.map: jsdummy.captiveportal.intermediate

# Make doesn't have an intuitive way to handle multiple targets
# Stack overflow has a solution:
# http://stackoverflow.com/questions/2973445/gnu-makefile-rule-generating-a-few-targets-from-a-single-source-file
# Targets that .INTERMEDIATE depends on are treated as intermediate files.
# This tells make that dummy.captiveportal.intermediate won't exist when make is run
# but its absence won't cause the recipe to be run spuriously.
.INTERMEDIATE: jsdummy.captiveportal.intermediate
jsdummy.captiveportal.intermediate: | $(BUILD_DIR)/js
	"$(BIN)/browserify" js/captiveportal.js --debug -t [ babelify --presets [es2015] ] | \
	"$(BIN)/exorcist" bundle.js.map > bundle.js
	"$(BIN)/uglifyjs" bundle.js --in-source-map bundle.js.map --source-map $(BUILD_DIR)/js/captiveportal.min.js.map \
	--source-map-url captiveportal.min.js.map -o $(BUILD_DIR)/js/captiveportal.min.js -c
	$(clean-js-bundle)


$(BUILD_DIR)/css/captiveportal.min.css $(BUILD_DIR)/css/captiveportal.min.css.map: $(wildcard css/*.scss)
$(BUILD_DIR)/css/captiveportal.min.css $(BUILD_DIR)/css/captiveportal.min.css.map: cssdummy.captiveportal.intermediate

.INTERMEDIATE: cssdummy.captiveportal.intermediate
cssdummy.captiveportal.intermediate: | $(BUILD_DIR)/css
	"$(BIN)/node-sass" --source-map=$(BUILD_DIR)/css/captiveportal.min.css.map --output-style=compressed \
	css/captiveportal.scss $(BUILD_DIR)/css/captiveportal.min.css 

#	"$(BIN)/node-sass" --source-map=bundle.css.map --output-style=compressed \
#	css/captiveportal.scss bundle.css 
#	"$(BIN)/postcss" bundle.css -u autoprefixer -o $(BUILD_DIR)/css/captiveportal.min.css \
#	--map $(BUILD_DIR)/css/captiveportal.min.css.map 
#	$(clean-css-bundle)

#$(BUILD_DIR)/%.html: %.html | $(BUILD_DIR)
#	cp -f $< $@

#$(BUILD_DIR)/fonts/%: fonts/% | $(BUILD_DIR)/fonts
#	cp -f $< $@

clean:
	$(clean-js-bundle)
	$(clean-css-bundle)
	rm -fr $(BUILD_DIR)

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

$(BUILD_DIR)/js:
	mkdir -p $(BUILD_DIR)/js

$(BUILD_DIR)/css:
	mkdir -p $(BUILD_DIR)/css

$(BUILD_DIR)/images:
	mkdir -p $(BUILD_DIR)/images

#$(BUILD_DIR)/fonts:
#	mkdir -p $(BUILD_DIR)/fonts

$(BUILD_DIR)/images/%: images/% | $(BUILD_DIR) $(BUILD_DIR)/images
	mkdir -p $(dir $@)
	cp -f $< $@

lint:
	"$(BIN)/eslint" $(filter-out js/jquery.min.js,$(wildcard js/*.js))
	"$(BIN)/sass-lint" css/*.scss
