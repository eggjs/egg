title: Installation
---

# Installation

The best way to install [node] is [nvm] in OS X and Linux, or [nvmw] in Windows.

**Don't use sudo.**

After [install nvm](https://github.com/creationix/nvm#install-script), you can install node.

```
$ nvm install 4
```

You can switch version that is installed.

```bash
$ nvm use 4
$ node -v
$ nvm use 6
$ node -v
```

## Global module

Global module is the module that is installed with `-g` flag. You can share global modules between multi version.

If you are using nvm, it will switch `prefix` when switch versions. But you can specify `prefix` to use one global module between versions.

1. Edit `~/.npmrc`，append `prefix=~/.npm-global`
2. Edit `~/.zshrc` or `~/.bashrc`，，append ` export PATH=~/.npm-global/bin:$PATH`
3. Run `source ~/.zshrc` or `source ~/.bashrc`


[nvm]: https://github.com/creationix/nvm
[nvmw]: https://github.com/hakobera/nvmw
[node]: https://nodejs.org/
