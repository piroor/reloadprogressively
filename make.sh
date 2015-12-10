#!/bin/sh

appname=reloadprogressively

cp makexpi/makexpi.sh ./
./makexpi.sh -n $appname -o
rm ./makexpi.sh

