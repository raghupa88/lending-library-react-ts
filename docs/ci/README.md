# CI workflow

GitHub blocks this session's token from writing workflow files (missing
`workflow` OAuth scope). To activate CI, move `ci.yml` to
`.github/workflows/ci.yml` and commit from an environment with that scope:

```bash
mkdir -p .github/workflows
git mv docs/ci/ci.yml .github/workflows/ci.yml
git commit -m "ci: activate GitHub Actions workflow"
```
