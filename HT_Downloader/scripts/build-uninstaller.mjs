import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

if (process.platform !== 'win32') {
  throw new Error('The uninstall launcher is only built for Windows.');
}

const frameworkRoot = 'C:\\Windows\\Microsoft.NET\\Framework64';
const compiler = path.join(frameworkRoot, 'v4.0.30319', 'csc.exe');
if (!existsSync(compiler)) {
  throw new Error(`C# compiler not found: ${compiler}`);
}

const setupDirectory = path.resolve('Setup');
const source = path.resolve('resources/uninstaller/Program.cs');
const output = path.join(setupDirectory, 'uninstall.exe');
mkdirSync(setupDirectory, { recursive: true });

execFileSync(compiler, [
  '/nologo',
  '/target:winexe',
  '/optimize+',
  '/reference:System.Windows.Forms.dll',
  `/out:${output}`,
  source
], { stdio: 'inherit' });

console.log(`Created ${output}`);

for (const generatedPath of [
  path.join(setupDirectory, '.icon-ico'),
  path.join(setupDirectory, 'win-unpacked'),
  path.join(setupDirectory, 'install.exe.blockmap')
]) {
  rmSync(generatedPath, { recursive: true, force: true });
}

console.log('Removed temporary packaging files; Setup now contains only install.exe and uninstall.exe.');
