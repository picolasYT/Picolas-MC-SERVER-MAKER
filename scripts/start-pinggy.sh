#!/usr/bin/env bash
PORT=${1:-25565}
ssh -o StrictHostKeyChecking=no -p 443 -R0:localhost:$PORT tcp@a.pinggy.io
