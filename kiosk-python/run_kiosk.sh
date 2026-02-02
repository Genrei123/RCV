#!/bin/bash
# Quick launcher script for RCV Kiosk

cd "$(dirname "$0")"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Run the kiosk application
python3 main.py
