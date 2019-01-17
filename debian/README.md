# 2-IMMERSE Debian System Image Builder

This directory contains the build scripts to make the 2-IMMERSE system image. 
The Makefile should be invoked from the Makefile in the parent directory which ensures it shares a target build directory with the 2-IMMERSE debian package builder i.e. it assumes that the 2immerse-firmware has already been built and placed inside the build directory (`build/2immerse-firmware_1.1-1_all.deb`).

The builder uses the Debian Live Systems project to create a custom Debian Linux distribution. See reference: <https://live-team.pages.debian.net/live-manual/html/live-manual/index.en.html>

## Directory structure:

* `bin/`
  Build scripts for creating the system image
* `config/`
  Configuration scripts used by the Debian Live System Project

## Debugging package installation problems

Tbhe 2-IMMERSE distribution of Debian pins a number of packages to get them from the 'testing' or 'stretch-backports' or 'buster' repositories.
In particular, this is done for the linux-image-amd64 package.

To diagnose package installation problems within the chroot environment of the debian live-builder, type:

```
$ cd debian
$ make BUILD_DIR=../build shell
```

This will start a bash shell in the docker container. Now build the debian iso by typing:

```
$ build.sh
```

Assuming this fails with a package versioning/installation problem such as:

```
Some packages could not be installed. This may mean that you have
requested an impossible situation or if you are using the unstable
distribution that some required packages have not yet been created
or been moved out of Incoming.
The following information may help to resolve the situation:

The following packages have unmet dependencies:
 2immerse-firmware : Depends: chromium-browser (= 66.0.3359.81-0ubuntu1~ppa1~16.04.1) but it is not going to be installed
                     Depends: chromium-browser-l10n (= 66.0.3359.81-0ubuntu1~ppa1~16.04.1) but it is not going to be installed
                     Depends: chromium-chromedriver (= 66.0.3359.81-0ubuntu1~ppa1~16.04.1) but it is not going to be installed
E: Unable to correct problems, you have held broken packages.
```

You can then chroot into the chroot directory left behind by the Debian live-builder by typing:

```
$ chroot live-image/chroot
```

You can then inspect package policies and diagnose apt-get related problems, e.g.:

```
# apt-cache policy chromium-browser
```

etc..