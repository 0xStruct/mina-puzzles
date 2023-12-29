// simple script to copy over contracts and their build versions
// deployment on Vercel doesn't check references outside of UI folder
const { promises: fs } = require("fs")
const path = require("path")

async function copyDir(src, dest) {
    let entries = await fs.readdir(src, { recursive: true, withFileTypes: true })

    for (let entry of entries) {
        let srcPath = path.join(src +"/", entry.name);
        let destPath = srcPath.replace(src, dest);
        let destDir = path.dirname(destPath);
        console.log(srcPath, destPath, destDir)
        
        if (entry.isFile()) {
            await fs.mkdir(destDir, { recursive: true })
            await fs.copyFile(srcPath, destPath);
        }
    }
}

copyDir("../contracts/src", "./src/contracts")
// copyDir("../contracts/build/src", "./src/contracts/build")
