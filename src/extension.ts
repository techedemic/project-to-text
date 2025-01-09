import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import ignore from 'ignore';

// Function to check if a file is binary by reading its first few bytes
function isBinaryFile(filePath: string): boolean {
    try {
        // Read the first 4KB of the file
        const buffer = Buffer.alloc(4096);
        const fd = fs.openSync(filePath, 'r');
        const bytesRead = fs.readSync(fd, buffer, 0, 4096, 0);
        fs.closeSync(fd);

        // Check for null bytes and high percentage of non-ASCII chars
        let nullCount = 0;
        let nonAsciiCount = 0;

        for (let i = 0; i < bytesRead; i++) {
            if (buffer[i] === 0) {
                nullCount++;
            } else if (buffer[i] > 127) {
                nonAsciiCount++;
            }
        }

        // If we have null bytes or high percentage of non-ASCII, likely binary
        if (nullCount > 0) {
            return true;
        }

        const nonAsciiRatio = nonAsciiCount / bytesRead;
        return nonAsciiRatio > 0.3; // 30% threshold for non-ASCII characters

    } catch (error) {
        console.error(`Error checking if file is binary: ${filePath}`, error);
        return false;
    }
}

// Function to check if a path contains a hidden directory
function hasHiddenDirectory(filePath: string): boolean {
    const parts = filePath.split(path.sep);
    return parts.some(part => part.startsWith('.'));
}

// Function to normalize path for gitignore checking
function normalizePath(filePath: string): string {
    return filePath.split(path.sep).join('/');
}



function shouldExcludeFile(filePath: string, relativePath: string, ig: any, config: vscode.WorkspaceConfiguration): boolean {
    // Check gitignore rules if enabled
    if (config.get<boolean>('respectGitignore', true)) {
        const normalizedPath = normalizePath(relativePath);
        if (ig.ignores(normalizedPath)) {
            console.log(`Gitignore rule matched: ${normalizedPath}`);
            return true;
        }
    }

    // Check ignored files list
    const ignoreFiles = config.get<string[]>('ignoreFiles', []);
    if (ignoreFiles.includes(path.basename(filePath))) {
        console.log(`Ignored file matched: ${relativePath}`);
        return true;
    }

    // Check ignored extensions
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const ignoreExtensions = config.get<string[]>('ignoreExtensions', []);
    if (ignoreExtensions.includes(ext)) {
        console.log(`Ignored extension detected: ${relativePath}`);
        return true;
    }

    // Check for export files
    if (path.basename(filePath).match(/^export_\d+\.txt$/)) {
        return true;
    }

    // Check for hidden directories
    if (hasHiddenDirectory(relativePath)) {
        return true;
    }

    return false;
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Project to text extension is now active!');

    const disposable = vscode.commands.registerCommand('project-to-text.exportToText', async () => {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            const config = vscode.workspace.getConfiguration('projectToText');
            const respectGitignore = config.get<boolean>('respectGitignore', true);
            const createFile = config.get<boolean>('createFile', true);
            const copyToClipboard = config.get<boolean>('copyToClipboard', false);
            const maxFileSizeMB = config.get<number>('maxFileSizeMB', 5);
            const maxFileSize = maxFileSizeMB * 1024 * 1024;

            const rootPath = workspaceFolders[0].uri.fsPath;
            let exportContent = '';
            let fileCount = 0;
            let skippedSize = 0;
            let skippedBinary = 0;
            let skippedGitignore = 0;

            const ig = ignore();
            if (respectGitignore) {
                const gitignorePath = path.join(rootPath, '.gitignore');
                if (fs.existsSync(gitignorePath)) {
                    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
                    ig.add(gitignoreContent);
                }
            }

            async function processDirectory(dirPath: string) {
                const entries = fs.readdirSync(dirPath, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(dirPath, entry.name);
                    const relativePath = path.relative(rootPath, fullPath);

                    if (shouldExcludeFile(fullPath, relativePath, ig, config)) {
                        skippedGitignore++;
                        continue;
                    }
                    
                    if (entry.isDirectory()) {
                        await processDirectory(fullPath);
                        continue;
                    }

                    try {
                        const stats = fs.statSync(fullPath);
                        if (stats.size > maxFileSize) {
                            console.log(`Size limit exceeded: ${relativePath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
                            skippedSize++;
                            continue;
                        }

                        // Check if file is binary
                        if (isBinaryFile(fullPath)) {
                            console.log(`Binary file detected: ${relativePath}`);
                            skippedBinary++;
                            continue;
                        }

                        const content = fs.readFileSync(fullPath, 'utf8');
                        fileCount++;
                        exportContent += `File ${fileCount}:\n>----------<\n`;
                        exportContent += `Filename: ./${relativePath}\n>----------<\n`;
                        exportContent += `Body:\n\`\`\`\n${content}\n\`\`\`\n\n`;
                    } catch (err) {
                        console.error(`Error processing file ${fullPath}:`, err);
                    }
                }
            }

            await processDirectory(rootPath);

            if (copyToClipboard) {
                try {
                    const clipboardy = await import('clipboardy');
                    await clipboardy.default.write(exportContent);
                    vscode.window.showInformationMessage('Export content copied to clipboard');
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to copy to clipboard: ${error}`);
                }
            }

            if (createFile) {
                const timestamp = new Date().toISOString()
                    .replace(/[-:]/g, '')
                    .replace(/T/, '')
                    .split('.')[0];

                const exportPath = path.join(rootPath, `export_${timestamp}.txt`);
                fs.writeFileSync(exportPath, exportContent);
                
                const summary = [
                    `Export complete! Created: export_${timestamp}.txt`,
                    `Files processed: ${fileCount}`,
                    skippedGitignore > 0 ? `Files/directories skipped (gitignore): ${skippedGitignore}` : '',
                    skippedSize > 0 ? `Files skipped (size): ${skippedSize}` : '',
                    skippedBinary > 0 ? `Files skipped (binary): ${skippedBinary}` : ''
                ].filter(Boolean).join('. ');

                vscode.window.showInformationMessage(summary);
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Export failed: ${error}`);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}