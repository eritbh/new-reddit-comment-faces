# New Reddit comment faces

A browser extension that renders comment faces, spoiler codes, and other old Reddit CSS hacks on new Reddit.

## Building

### Requirements

- A recent Node.js version (last checked with Node 14.15.1, npm 6.14.9)

### Build scripts

The build scripts output to a `build` directory under the project root. Install dev dependencies, then run the appropriate build script for the target platform. Between builds, run the clean script to get rid of outdated artifacts.

```bash
# Install dev dependencies
$ npm install
# Build for Firefox
$ npm run build:firefox
# Build for Chrome
$ npm run build:chrome
# Clean build directory between builds
$ npm run clean
# Run code linting
$ npm run lint
```

The build process doesn't currently handle moving icons, so manually copy `src/icon96.png` to the build directory after running a build command.
