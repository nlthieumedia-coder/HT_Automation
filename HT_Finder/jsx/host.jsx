/**
 * Asset Finder - ExtendScript Host Script
 */

// Simple JSON Stringify/Parse polyfill for ExtendScript's ES3 environment
var JSONXS = {
    stringify: function (obj) {
        var t = typeof (obj);
        if (t !== "object" || obj === null) {
            if (t === "string") return '"' + obj.replace(/"/g, '\\"') + '"';
            return String(obj);
        } else {
            var json = [], arr = (obj && obj.constructor === Array);
            for (var n in obj) {
                if (obj.hasOwnProperty(n)) {
                    var v = obj[n];
                    t = typeof(v);
                    if (t === "function" || t === "undefined") continue;
                    var val = this.stringify(v);
                    json.push((arr ? "" : '"' + n + '":') + val);
                }
            }
            return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
        }
    },
    parse: function (str) {
        try {
            return eval("(" + str + ")");
        } catch (e) {
            return null;
        }
    }
};

/**
 * Basic connection verification function
 * @returns {string} Success message
 */
function assetFinderPing() {
    return "Asset Finder Host Ready";
}

/**
 * Recursively fetches all bins (folders) in the active project
 * @returns {string} JSON-stringified array of bin path strings
 */
function getProjectBinsJson() {
    if (!app.project) {
        return "[]";
    }

    var root = app.project.rootItem;
    if (!root) {
        return "[]";
    }

    var bins = [];
    traverseBins(root, "", bins);
    return JSONXS.stringify(bins);
}

function traverseBins(folderItem, currentPath, accumulator) {
    if (!folderItem || folderItem.type !== 2) return; // 2 = Bin

    var children = folderItem.children;
    if (!children) return;

    var numItems = children.numItems;
    for (var i = 0; i < numItems; i++) {
        var item = children[i];
        if (item && item.type === 2) { // 2 = Bin
            var subPath = currentPath ? currentPath + "/" + item.name : item.name;
            accumulator.push(subPath);
            traverseBins(item, subPath, accumulator);
        }
    }
}

/**
 * Resolve or recursively create a bin structure under rootItem
 * @param {Object} rootItem The project root ProjectItem
 * @param {string} pathStr Bin path (e.g., "01_FOOTAGE/STOCK/PEXELS")
 * @returns {Object} Target Bin ProjectItem
 */
function resolveOrCreateBinPath(rootItem, pathStr) {
    if (!pathStr || pathStr === "" || pathStr.toLowerCase() === "root") {
        return rootItem;
    }

    var currentFolder = rootItem;
    // Replace backslashes and split path
    var cleanPath = pathStr.replace(/\\/g, "/");
    var parts = cleanPath.split("/");
    
    for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        if (part === "") continue;
        
        var matchedBin = findChildBinByName(currentFolder, part);
        if (!matchedBin) {
            // Create bin synchronously in ExtendScript
            matchedBin = currentFolder.createBin(part);
        }
        
        if (!matchedBin) {
            return null;
        }
        
        currentFolder = matchedBin;
    }

    return currentFolder;
}

function findChildBinByName(parent, name) {
    if (!parent || !parent.children) return null;
    var children = parent.children;
    var numItems = children.numItems;
    for (var i = 0; i < numItems; i++) {
        var item = children[i];
        if (item && item.name === name && item.type === 2) { // 2 = Bin
            return item;
        }
    }
    return null;
}

/**
 * Imports a file on local disk into a target project bin (folder)
 * @param {string} filePath Absolute local file path
 * @param {string} binPath Target bin route (e.g. "02_B-ROLL")
 * @returns {string} JSON-stringified success object { success: boolean, error?: string }
 */
function importFileToBin(filePath, binPath) {
    if (!app.project) {
        return JSONXS.stringify({ success: false, error: "No Premiere project open" });
    }

    var root = app.project.rootItem;
    if (!root) {
        return JSONXS.stringify({ success: false, error: "Cannot access rootItem" });
    }

    try {
        // 1. Resolve or create target folder/bin structure
        var targetBin = resolveOrCreateBinPath(root, binPath);
        if (!targetBin) {
            return JSONXS.stringify({ success: false, error: "Failed to create target folder structure: " + binPath });
        }

        // 2. Execute import
        // importFiles(filePaths, suppressUI, targetBin, asNumberedStills)
        var filePathsArray = [filePath];
        var importSuccess = app.project.importFiles(filePathsArray, true, targetBin, false);
        
        if (importSuccess) {
            return JSONXS.stringify({ success: true });
        } else {
            return JSONXS.stringify({ success: false, error: "Premiere importFiles API returned failure status" });
        }
    } catch (e) {
        return JSONXS.stringify({ success: false, error: "ExtendScript exception: " + e.message });
    }
}
