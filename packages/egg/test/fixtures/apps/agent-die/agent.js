
setTimeout(() => {
  throw new Error('app worker throw');
}, 5000);
