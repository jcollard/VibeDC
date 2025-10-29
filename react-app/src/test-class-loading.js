const yaml = require('js-yaml');
const fs = require('fs');

const classYaml = fs.readFileSync('./data/class-database.yaml', 'utf8');
const data = yaml.load(classYaml);

const fighter = data.classes.find(c => c.id === 'fighter');
console.log('Fighter class data:');
console.log('allowedEquipmentTypes:', fighter.allowedEquipmentTypes);
console.log('');

const rogue = data.classes.find(c => c.id === 'rogue');
console.log('Rogue class data:');
console.log('allowedEquipmentTypes:', rogue.allowedEquipmentTypes);
console.log('');

const apprentice = data.classes.find(c => c.id === 'apprentice');
console.log('Apprentice class data:');
console.log('allowedEquipmentTypes:', apprentice.allowedEquipmentTypes);
