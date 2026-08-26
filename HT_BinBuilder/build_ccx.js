"use strict";
const fs=require("fs"),path=require("path"),archiver=require("archiver");
const [stageDir,outputPath]=process.argv.slice(2);
if(!stageDir||!outputPath)throw new Error("Usage: node build_ccx.js <stage-directory> <output.ccx>");
function files(root,current=""){return fs.readdirSync(path.join(root,current),{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(root,path.join(current,entry.name)):[path.join(current,entry.name)]).sort();}
const output=fs.createWriteStream(outputPath),archive=archiver("zip",{zlib:{level:9}});
archive.on("error",error=>{throw error;}); output.on("close",()=>process.stdout.write(`${archive.pointer()} bytes written\n`)); archive.pipe(output);
const manifest=JSON.parse(fs.readFileSync(path.join(stageDir,"manifest.json"),"utf8")); archive.append(JSON.stringify(manifest,null,2),{name:"manifest.json"});
for(const file of files(stageDir).filter(x=>x!=="manifest.json"))archive.file(path.join(stageDir,file),{name:file.split(path.sep).join("/")}); archive.finalize();
