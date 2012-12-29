#!/bin/sh

appname=reloadprogressively

cp buildscript/makexpi.sh ./
./makexpi.sh -n $appname -o
rm ./makexpi.sh

