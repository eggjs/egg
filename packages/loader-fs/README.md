# @eggjs/loader-fs

Loader-facing filesystem abstraction for Egg loaders and bundled runtimes.

## Usage

```ts
import { RealLoaderFS, type LoaderFS } from '@eggjs/loader-fs';

const loaderFS: LoaderFS = new RealLoaderFS();
```

`LoaderFS` intentionally covers only the operations required by loader code:
`exists`, `stat`, `realpath`, `readJSON`, `glob`, and `loadFile`.
