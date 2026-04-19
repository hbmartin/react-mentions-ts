# Contributing

Thank you for your interest in contributing to React-Mentions!
This project is made possible by contributors like you, and we welcome any contributions to the code-base and the documentation.

## Environment

- Ensure you have Node 22 or later.
- Enable [Corepack](https://nodejs.org/api/corepack.html) and activate the pnpm version pinned by this repository with `corepack enable && corepack install`.
- Run `pnpm install` to install all needed dev dependencies.

## Making Changes

Pull requests are encouraged. If you want to add a feature or fix a bug:

1. [Fork](https://docs.github.com/en/github/getting-started-with-github/fork-a-repo) and [clone](https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/cloning-a-repository) the [repository](https://github.com/hbmartin/react-mentions-ts)
2. [Create a separate branch](https://docs.github.com/en/desktop/contributing-and-collaborating-using-github-desktop/managing-branches) for your changes
3. Make your changes, and ensure that it is formatted by oxfmt
4. Write tests that validate your change and/or fix.
5. Run `pnpm build` and then run tests with `pnpm test`
6. If coding a new feature, please add the examples to the example app (`/demo/src/examples`) and add the docs to the `README.md` file.
7. Push your branch and open a PR 🚀

## Performance Notes

The repository tracks deterministic perf results in Git notes under `refs/notes/perf`.

- Run `pnpm perf:check` to compare your current branch against the nearest recorded baseline on `origin/master`.
- Run `pnpm perf:record` only when you intend to attach a perf note to the current `HEAD` commit.

Optional local Git setup for maintainers:

```bash
git config --add remote.origin.fetch +refs/notes/perf:refs/notes/perf
git config --add notes.displayRef refs/notes/perf
git config --add notes.rewriteRef refs/notes/perf
```

With that config in place, `git log --notes=perf` and `git show --notes=perf <commit>` will display recorded perf notes locally.
