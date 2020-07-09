#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

# Executes cleanup function at script exit.
trap cleanup EXIT

# get current directory
PWD=$(pwd)

cleanup() {
  echo "Cleaning up"
  pkill -f aedes
  echo "Done"
}

start_aedes() {
  npm run broker > /dev/null &
}

echo "Starting MQTT broker"
start_aedes

npm run test
