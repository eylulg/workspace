#!/bin/sh
# Vercel install step. package.json depends on file:../ui, which is not part of this repository,
# so clone the component library into .ui, build it and point the dependency there for this build only.
set -e
rm -rf .ui
git clone --depth 1 https://github.com/eylulg/ui .ui
(cd .ui && npm ci && npm run build)
# Drop the library's own dependencies so it resolves React from this app, not from a second copy.
rm -rf .ui/node_modules
npm pkg set "dependencies.@eylulg/ui=file:./.ui"
npm install --no-audit --no-fund --install-links
