const path = require('path');

module.exports = () => {
  return {
    dist: path.resolve(__dirname, './typings/custom2.d.ts'),
    content: 'export const a: string;'
  }
}
