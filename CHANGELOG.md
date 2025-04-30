# Changelog

## Version 1.8.2 (2024-07-10)

### Enhancements
- Made `flash-install` command without arguments run the install command by default
- Improved user experience by allowing both `flash-install` and `flash-install install` to work the same way

## Version 1.8.1 (2024-07-10)

### Breaking Changes
- Changed the `flash-install` command to use the direct CLI implementation for better reliability and performance
- Removed the React-based terminal UI to avoid compatibility issues with React versions

### Bug Fixes
- Fixed critical error when running `flash-install` after downloading
- Fixed React version compatibility issues by downgrading React from 19.1.0 to 18.3.1
- Updated the postinstall script to make the direct CLI executable

### Documentation
- Updated README and documentation to reflect the new command usage
- Clarified that `flash-install install` is the recommended command
- Added more examples of command usage

## Version 1.8.0

Initial release with full feature set.
