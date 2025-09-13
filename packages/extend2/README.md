# @eggjs/extend2

Forked from [node-extend], the difference is overriding array as primitive when deep clone.

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/@eggjs/extend2.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/extend2
[snyk-image]: https://snyk.io/test/npm/extend2/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/extend2
[download-image]: https://img.shields.io/npm/dm/@eggjs/extend2.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/extend2

## Usage

```ts
import { extend } from '@eggjs/extend2';

// for deep clone
extend(true, {}, object1, objectN);
```

## License

`@eggjs/extend2` is licensed under the [MIT License](LICENSE).

## Acknowledgements

All credit to the jQuery authors for perfecting this amazing utility.

Ported to Node.js by [Stefan Thomas][github-justmoon] with contributions by [Jonathan Buchanan][github-insin] and [Jordan Harband][github-ljharb].

<!-- GITCONTRIBUTOR_START -->

## Contributors

|    [<img src="https://avatars.githubusercontent.com/u/45469?v=4" width="100px;"/><br/><sub><b>ljharb</b></sub>](https://github.com/ljharb)<br/>     | [<img src="https://avatars.githubusercontent.com/u/53233?v=4" width="100px;"/><br/><sub><b>justmoon</b></sub>](https://github.com/justmoon)<br/> | [<img src="https://avatars.githubusercontent.com/u/1557266?v=4" width="100px;"/><br/><sub><b>jonmorehouse</b></sub>](https://github.com/jonmorehouse)<br/> | [<img src="https://avatars.githubusercontent.com/u/360661?v=4" width="100px;"/><br/><sub><b>popomore</b></sub>](https://github.com/popomore)<br/> | [<img src="https://avatars.githubusercontent.com/u/2396468?v=4" width="100px;"/><br/><sub><b>greelgorke</b></sub>](https://github.com/greelgorke)<br/> | [<img src="https://avatars.githubusercontent.com/u/273857?v=4" width="100px;"/><br/><sub><b>andyburke</b></sub>](https://github.com/andyburke)<br/> |
| :-------------------------------------------------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------------------------------------------------------: |
| [<img src="https://avatars.githubusercontent.com/u/788368?v=4" width="100px;"/><br/><sub><b>blaise-io</b></sub>](https://github.com/blaise-io)<br/> | [<img src="https://avatars.githubusercontent.com/u/680696?v=4" width="100px;"/><br/><sub><b>danbell</b></sub>](https://github.com/danbell)<br/>  |   [<img src="https://avatars.githubusercontent.com/u/2598089?v=4" width="100px;"/><br/><sub><b>jamielinux</b></sub>](https://github.com/jamielinux)<br/>   |    [<img src="https://avatars.githubusercontent.com/u/226692?v=4" width="100px;"/><br/><sub><b>insin</b></sub>](https://github.com/insin)<br/>    |   [<img src="https://avatars.githubusercontent.com/u/152407?v=4" width="100px;"/><br/><sub><b>madarche</b></sub>](https://github.com/madarche)<br/>    |  [<img src="https://avatars.githubusercontent.com/u/1088720?v=4" width="100px;"/><br/><sub><b>Mithgol</b></sub>](https://github.com/Mithgol)<br/>   |
|   [<img src="https://avatars.githubusercontent.com/u/156269?v=4" width="100px;"/><br/><sub><b>fengmk2</b></sub>](https://github.com/fengmk2)<br/>   |   [<img src="https://avatars.githubusercontent.com/u/5362563?v=4" width="100px;"/><br/><sub><b>2hu12</b></sub>](https://github.com/2hu12)<br/>   |

This project follows the git-contributor [spec](https://github.com/xudafeng/git-contributor), auto updated at `Sat Jun 15 2024 10:08:30 GMT+0800`.

<!-- GITCONTRIBUTOR_END -->

[github-justmoon]: https://github.com/justmoon
[github-insin]: https://github.com/insin
[github-ljharb]: https://github.com/ljharb
[node-extend]: https://github.com/justmoon/node-extend
