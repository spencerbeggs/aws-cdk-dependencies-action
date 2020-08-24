# AWS CDK Dependencies Action

Spinning up infrasructure on AWS is a breeze with [AWS CDK](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-construct-library.html), but keeping repositiories for stacks and constructs up to date with the CDK [release cycle](https://github.com/aws/aws-cdk/releases) can be a headache when the there CDK team drops a new release at least once a week. As the project matures, new modules are added, old ones are deprecated and breaking changes are introduced regularly. The entire ecosystem is modularized with components depending on eachother with evolving peer despendencies.

This action is examines a CDK release and generates a dependency graph for the whole ecosystem including peer dependencies for inclusion in a Typescript project exported stringified JSON. It attempts to follow the dependecies the way the CDK team declares them and merges peer dependencies when they are out of sync — looking at you Jest depencency of [@asw-cdk/assert](https://github.com/aws/aws-cdk/tree/master/packages/%40aws-cdk/assert).

The result can be used in further actions to speed up the development flow of projects using CDK. Since breaking changes happen often in CDK, you might not want to rely on this to auto-release updates unless you have a really buttoned-downed test suite, but at least it can get [Dependabot](https://docs.github.com/en/github/administering-a-repository/enabling-and-disabling-version-updates#enabling-github-dependabot-version-updates) from getting too noisy.

## Usages
