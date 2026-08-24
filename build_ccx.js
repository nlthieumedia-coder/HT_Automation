"use strict";

const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const [stageDir, outputPath] = process.argv.slice(2);
if (!stageDir || !outputPath) {
    throw new Error("Usage: node build_ccx.js <stage-directory> <output.ccx>");
}

function listFiles(root, current = "") {
    const absolute = path.join(root, current);
    const result = [];
    for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
        const relative = path.join(current, entry.name);
        if (entry.isDirectory()) {
            result.push(...listFiles(root, relative));
        } else if (entry.isFile()) {
            result.push(relative);
        }
    }
    return result.sort();
}

const output = fs.createWriteStream(outputPath);
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
    process.stdout.write(`${archive.pointer()} bytes written\n`);
});
output.on("error", error => {
    throw error;
});
archive.on("warning", error => {
    if (error.code !== "ENOENT") throw error;
});
archive.on("error", error => {
    throw error;
});

archive.pipe(output);

// Adobe UDT writes a normalized manifest as the first ZIP entry. Creative
// Cloud's metadata extractor relies on this ordering for independent CCX files.
const manifestPath = path.join(stageDir, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });

for (const relativePath of listFiles(stageDir).filter(file => file !== "manifest.json")) {
    archive.append(fs.createReadStream(path.join(stageDir, relativePath)), {
        name: relativePath.split(path.sep).join("/")
    });
}
archive.finalize();
