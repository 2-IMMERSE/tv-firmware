#!/bin/bash

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

# Make commands which fail cause the shell script to exit immediately.
set -e

echo "Building debian live image"

# Naming of the distribution can't be 'stable', it must a codename e.g. 'stretch'
# http://debian-live.debian.narkive.com/9RDAlUwf/problem-creating-binary-disk
DISTRIBUTION=stretch

WORKING_DIR=live-image

mkdir -p $WORKING_DIR && cd $WORKING_DIR

# Clean-up any previous builds.
lb clean

# 'lb config' creates a 'config/' hierarchy
# 'linux-headers' and 'linux-image' are both needed by dkms to rebuild virtual box for the selected kernel version
# 'lb config' will auto select the right version of the kernel headers/image packages.
# (See: https://unix.stackexchange.com/questions/286934/how-to-install-virtualbox-guest-additions-in-a-debian-virtual-machine)
# '--apt-indices false' saves space on the image medium by excluding APT indices.
# '--bootappend-live' allows us to specify the user to use when booting as a livecd
# '-b hdd' builds a HDD image, rather than a hybrid.iso, thus eliminating one extra option in the BIOS boot menu.
lb config --linux-packages "linux-image linux-headers" \
   --distribution $DISTRIBUTION \
   --archive-areas "main contrib" \
   --debian-installer live \
   --bootappend-live "boot=live config hostname=2immerse" \
   --apt-indices false \
   --apt-source-archives false \
   --architectures amd64 \
   --linux-flavours amd64 \
   --win32-loader false \
   --debian-installer-gui false \
   --bootloader grub-efi \
   --binary-images iso-hybrid 

# 'lb config --debian-installer live' doesn't work on its own without
# the 'debian-installer-launcher' package being installed into the chroot too.
echo debian-installer-launcher > config/package-lists/my.list.chroot

# Packages in this directory are automatically installed into the live system during the build
#cp /build/2immerse-firmware_1.1-1_amd64.deb config/packages.chroot/
cp /build/2immerse-firmware_1.1-1_all.deb config/packages.chroot/

# Virtualbox guest additions are only available in 'stretch-backports'.
# See: https://wiki.debian.org/VirtualBox
echo "deb http://deb.debian.org/debian stretch-backports main contrib non-free" >> config/archives/stretch-backports.list.chroot
#echo "virtualbox virtualbox-guest-x11" >> config/package-lists/my.list.chroot

# Add ppa:saiarcot895/chromium-beta to obtain latest chromium with hardware accelerated video decoding enabled on linux  
echo "deb http://ppa.launchpad.net/saiarcot895/chromium-beta/ubuntu xenial main" > config/archives/saiarcot895.list.chroot

# Manually download and add the GPG key for the saiarcot895 repository
# (See: https://ubuntuforums.org/showthread.php?t=2196704)
gpg --keyserver keyserver.ubuntu.com --recv-keys DC058F40
gpg --export --armor DC058F40 > config/archives/saiarcot895.key.chroot

# This fixes problems with chromium-browser being dependent on newer packages than those
# available in the debian stretch (stable) and stretch-backports repository.
# These packages are available in 'sid' (unstable) and 'buster' (testing). 
# Use APT pinning to select these package dependencies from 'testing' or we could backport them
# ourselves.
echo "deb http://deb.debian.org/debian buster main contrib" >> config/archives/testing.list.chroot

# 'stable' distribution packages have an install priority of 500 by default.
# Set 'stretch-backports' to a prority of 500 too, to get apt to automatically satisfy dependencies.
# (See: https://blog.sleeplessbeastie.eu/2017/11/06/how-to-use-backports-repository/)
# APT pinning of libfontconfig1 (>= 2.11.94) because 2.11.0-6.7+b1 wants to be installed.
cat >> config/archives/myprefs.pref.chroot << EOF
Package: libfontconfig1 fontconfig-config
Pin: release n=buster
Pin-Priority: 991

Package: *
Pin: release n=stretch-backports
Pin-Priority: 500

Package: *
Pin: release n=buster
Pin-Priority: -1000
EOF

# 'dirmngr' appears to be needed when installing our custom package.
#
# Debian stretch doesn't seem to have the ntp daemon running by default.
# (UPDATE: Debian stretch uses systemd-timesyncd instead)
#
# There is a known issue with /dev/urandom random number generate with kernel 4.16.X
# which causes a 30 pause before reaching a completed boot target. Installing rng-tools
# mitigates the problem.
#
# Debian stretch doesn't have the Intel 8625 wifi driver/firmware installed by default. 
# Get firmware-iwlwifi from stretch-backports non-free: (see https://wiki.debian.org/iwlwifi)
# avahi-daemon isn't installed by default on debian, but is useful for device discovery
echo "dirmngr rng-tools sudo firmware-iwlwifi avahi-daemon" >> config/package-lists/my.list.chroot

cp /usr/src/generic.seed config/includes.installer/preseed.cfg

# Configure isolinux and syslinux bootloaders
# This is only required when not building with UEFI support. 
#mkdir -p config/bootloaders
#cp -fr /usr/share/live/build/bootloaders/syslinux config/bootloaders/
#cp -fr /usr/share/live/build/bootloaders/isolinux config/bootloaders/

#cat /usr/src/splash.svg | sed s/@GIT_HASH@/$FIRMWARE_VERSION/g > config/bootloaders/syslinux/splash.svg
#cp -f /usr/src/stdmenu.cfg config/bootloaders/syslinux/
#cp -f /usr/src/install.cfg config/bootloaders/syslinux/
#cp -f /usr/src/menu.cfg config/bootloaders/syslinux/

#cat /usr/src/splash.svg | sed s/@GIT_HASH@/$FIRMWARE_VERSION/g > config/bootloaders/isolinux/splash.svg
#cp -f /usr/src/install.cfg config/bootloaders/isolinux/
#cp -f /usr/src/menu.cfg config/bootloaders/isolinux/
#cp -f /usr/src/stdmenu.cfg config/bootloaders/isolinux/

# Bake the firmware version into the chroot filesystem
mkdir -p config/includes.chroot/etc
echo $FIRMWARE_VERSION > config/includes.chroot/etc/firmware-version

# Previous test required manual download of firmware after installing firmware-iwlwifi package
# but that might have been because I didn't reboot? This code will fetch the most recent version.
# (commented out until this is tested as a problem)
# wget https://git.kernel.org/cgit/linux/kernel/git/iwlwifi/linux-firmware.git/plain/iwlwifi-8265-31.ucode
# cp -f iwlwifi-8265-31.ucode config/includes/chroot/lib/firmware/

# Generates hybrid.iso image
lb build

cp -f live-image-amd64.hybrid.iso /build

