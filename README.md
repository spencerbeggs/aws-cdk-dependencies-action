# GitFlow Action Release Template

[GitHub Actions](https://docs.github.com/en/actions) has given developers a powerful toolkit to automate workflows and share tthem in the [GitHub Marketplace](https://github.com/marketplace?type=actions). Unfortunatly, GitHub made some [short-sighted decisions](https://docs.github.com/en/actions/creating-actions/publishing-actions-in-github-marketplace) about how [JavaScript action](https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action) have to be packaged to be published:

* The action must be in a public repository.
* Each repository must contain a single action.
* The action's metadata file (action.yml or action.yaml) must be in the root directory of the repository.

If you are building a module that has dependencies, this means that you are going to have to check your `node_modules` folder into your repo, which defeats the purpose of Node.js module pattern, and bloats the size of the final module. This also adds a lot of noise to your repository as you develop your action.

Compiling your code is a better option. At least you only end up with few pieces garbage in your repo. But if you have a complex toolchain, like compiling with [Babel](https://babeljs.io/) or from [Typescript](https://www.typescriptlang.org/), you can also end up with a lot of unnesseasy configuration and source files in your default branch as well which is bundled with the action.

When you want to publish an action to Marketplace, GitHub asks you to create a release from a tag or commit in your repo. You might think that you could bundle your action into a release artifact, but GitHub pulls the executable code from repo itself. If you are following basic GitFlow, this means your complied code is going to need to be in your default branch along with everything else.

This repo is a simple base template that uses GitHub Actions to work around these limitations and allows to to follow the basic GitFlow process for cutting releases. There are no complicaiton steps included in this repo itself — it doesn't even include a `package.json` — only the base code to enable it.

## How It Works

This repo has three branches:

* `marketplace` is the default branch in GitHub, this branch will receive only the compiled action code
* `main` is the base GitFlow branch
* `develop` is the GitFlow intergration branch

To get started, click "Use this template" on the repo's homepage. Create a new public repository and check the "Include all branches" checkbox. Check out your repository and switch to the develop branch and start building your module. By default the release workflow expects your repo to have an npm script named `build` that will compile your code including `action.yml` file into a folder named `dist`. 

When you merge a release branch into `main`, prefix the target release version tag with `source-`, for exmaple, `source-1.2.3`. When you push the tag to origin, the release workflow will:

* checkout the tag
* install your dependencies with yarn
* run the build command
* merge the built files to the `dist` folder into the release branch
* create a new tag on `marketplace` branch with the target semver version
* delete the source tag from `main`
* create a new GitHub release from the new tag

If you don't want to use yarn or want to change the specifics of the build command, just edit `release.yml`.