# Contributing

Thanks for helping. Bug fixes and small improvements can go straight to a pull request. For anything
that changes how recaps are decided (persona rules, achievement thresholds, the bot heuristic), what a
recap or share link contains, or the JSON contract, please open an issue first so we can agree on it.

## Run it

See [Run it](README.md#run-it) and [Development](README.md#development) in the README. With
`WRAPPED_FIXTURES=1` the web app renders the fixtures in `web/fixtures`, so most UI work doesn't need
the batch or the indexer at all.

## Before you open a pull request

CI runs the same checks on every pull request:

```sh
# batch/ and api/
gofmt -l . && go vet ./... && go test ./...

# web/
npm ci
npx next typegen
npm run typecheck && npm run lint
npm test
npm run e2e   # Playwright with your system Chrome; starts the api and a dev server
```

Tests that need real batch output (`data/out`) skip themselves when it isn't there.

## Rules that matter here

- **Share links never reveal the address.** Anything you add to a recap must be checked against the
  share view: either it can't identify the address, or `redact` in `batch/share.go` (and its fixture
  mirror in `web/src/lib/data.ts`) drops or coarsens it. Add a test next to the existing ones in
  `batch/batch_test.go` and the share-view tests in `web/tests/e2e/page.spec.ts`.
- **No real addresses in fixtures or tests.** Use the `g1wrapped…q` placeholders already there.
- **Keep the indexer cheap.** The batch only queries by block-height range; the indexer has no address
  index, so a filter on an address scans every transaction. Don't add per-user indexer queries.
- **One contract, two copies.** The recap JSON is defined in `batch/build.go` and mirrored in
  `web/src/lib/wrapped.ts`; change both, and `validate` on both sides if the shape changes.

## Commits and pull requests

- Commit subjects follow [Conventional Commits](https://www.conventionalcommits.org) with the part of
  the repo as the scope: `feat(batch): …`, `fix(web): …`, `docs: …`. The body says what changed and why.
- Keep pull requests small and about one thing. For UI changes, add a before/after screenshot.
- Contributions are licensed under the repository's [MIT license](LICENSE).

## Reporting a problem

Bugs and ideas: [open an issue](https://github.com/wookja-0/gno-wrapped/issues).
