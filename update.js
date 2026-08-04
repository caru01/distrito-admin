const fs = require('fs');
const file = 'e:\\RESPALDO PC CAMILO\\Documentos\\DistritoBG\\distrito-admin\\src\\pages\\AdminPedidos.jsx';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
let newModal = fs.readFileSync('new_modal.txt', 'utf8');
lines.splice(694, 916 - 694 + 1, newModal);
fs.writeFileSync(file, lines.join('\n'));
console.log('Successfully updated AdminPedidos.jsx!');
