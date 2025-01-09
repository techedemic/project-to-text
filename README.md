# Project to Text

Export your entire project's content to a single text file, perfect for sharing with Large Language Models (LLMs) or creating comprehensive project snapshots.

## Features

- Export all text files from your project into a single, well-formatted text file
- Automatically respects `.gitignore` rules
- Intelligently handles binary files and large files
- Configurable through VS Code settings
- Optional clipboard support
- Smart file filtering:
  - Skips binary files (images, executables, etc.)
  - Excludes files larger than a configurable size limit
  - Ignores hidden directories
  - Respects `.gitignore` patterns

## Usage

1. Open your project in VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) to open the Command Palette
3. Type "Export Project to Text" and select the command
4. The extension will create a file named `export_[timestamp].txt` in your project root

## Extension Settings

This extension contributes the following settings:

* `projectToText.respectGitignore`: Enable/disable .gitignore rules (default: `true`)
* `projectToText.createFile`: Create export file (default: `true`)
* `projectToText.copyToClipboard`: Copy content to clipboard (default: `false`)
* `projectToText.maxFileSizeMB`: Maximum file size in MB to process (default: `5`)

## Output Format

The exported text file follows this format:

```
File 1:
>----------<
Filename: ./relative/path/to/file1
>----------<
Body:
```
[contents of file1]
```

File 2:
>----------<
Filename: ./relative/path/to/file2
>----------<
Body:
```
[contents of file2]
```
```

## File Handling

The extension automatically skips:
- Binary files (executables, images, fonts, etc.)
- Files larger than the configured size limit
- Files in hidden directories
- Files matching .gitignore patterns
- Previously generated export files

## Requirements

No additional requirements. The extension works out of the box.

## Known Issues

- Very large projects might take some time to process
- Memory usage can be high when processing large files

## Release Notes

### 0.0.1

Initial release:
- Basic project export functionality
- Gitignore support
- Binary file detection
- Size limit enforcement
- Configurable settings

## Contributing

Feel free to submit issues and enhancement requests on the GitHub repository.

## License

This project is licensed under the MIT License.