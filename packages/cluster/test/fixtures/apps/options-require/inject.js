'use strict';

// in travis, the argv[2] is special
const index = process.argv.length - 2;
const file = process.argv[index];

console.log('###', process.argv);

if (file.includes('app_worker')) {
  console.log('### inject application');
}

if (file.includes('agent_worker')) {
  console.log('### inject agent');
}
