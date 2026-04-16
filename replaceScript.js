const fs = require('fs');
const path = require('path');

const directorios = ['app', 'src'];
const importarViejo = "import AsyncStorage from '@react-native-async-storage/async-storage';";
const importarViejoRegex = /import AsyncStorage from ['"]@react-native-async-storage\/async-storage['"];/g;
const importarNuevoSrc = "import { localDB as AsyncStorage } from '../src/services/localDB';";
const importarNuevoApp = "import { localDB as AsyncStorage } from '../src/services/localDB';";

function recDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            recDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (importarViejoRegex.test(content) || content.includes('@react-native-async-storage/async-storage')) {
                // Determine relative path depth
                let depth = fullPath.replace(/^c:\\RD\\RanchoDigital\\/, '').split('\\').length - 1;
                let relPath = '../'.repeat(depth) + 'src/services/localDB';
                // Adjust if already in src/services
                if (fullPath.includes('src\\services\\')) {
                     relPath = './localDB';
                }
                
                content = content.replace(importarViejoRegex, `import { localDB as AsyncStorage } from '${relPath}';`);
                // also replace dynamic requires if any
                content = content.replace(/require\(['"]@react-native-async-storage\/async-storage['"]\)\.default/g, `require('${relPath}').localDB`);

                fs.writeFileSync(fullPath, content);
                console.log('Modificado:', fullPath);
            }
        }
    });
}

directorios.forEach(recDir);
console.log('Script finalizado');
