<p align="center">
  <img src="assets/LOChy_Draft.png" alt="LOChy Logo" width="200"/>
</p>

# LOCNess

LOChy counts the lines of code in your repository with
[cloc](https://github.com/AlDanial/cloc) and renders a self-contained SVG badge:
the mascot, the repository name, the total lines of code, and a per-language
breakdown. It runs as a Node 20 GitHub Action: the action writes the badge, you
upload it as an artifact and publish it to GitHub Pages.

## Sample Badge

<p align="center">
  <img src="https://nart4hire.github.io/LOCNess/loc.svg" alt="LOChy Badge" width="200"/>
</p>

The badge above is produced by this repository's own self-count workflow and
served from its GitHub Pages site. Once your workflow has published a badge,
embed it the same way:

```markdown
![LOC badge](https://<user>.github.io/<repo>/loc.svg)
```

## Usage

Add a workflow that checks out your repository, runs the action, uploads the
SVG artifact, and pushes the badge directory to the `gh-pages` branch so GitHub
Pages serves it. The action writes to `dist/docs/loc.svg` by default; the Pages
step publishes the directory containing it.

```yaml
name: LOC badge

on:
  push:
    branches: [main]

permissions:
  contents: write

jobs:
  badge:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: nart4hire/LOCNess@v1
        with:
          path: .
          output: dist/docs/loc.svg
      - uses: actions/upload-artifact@v4
        with:
          name: loc-badge
          path: dist/docs/loc.svg
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: dist/docs
          publish_branch: gh-pages
```

`@v1` tracks the newest `v1.x.y` release. Pin an exact tag (`@v1.1.0`) if you
want the badge to stay frozen until you bump it.

## What gets counted

The badge is meant to describe *your source*, not your build output, so cloc is
run with `node_modules`, `vendor`, `bundle`, `build`, `dist` and `coverage`
excluded by default, and generated lock files (`package-lock.json`,
`pnpm-lock.yaml`, `Cargo.lock`, `go.sum`, …) filtered out by name. Override
either with the `exclude` and `exclude_files` inputs.

Hand-written manifests and config (`package.json`, `tsconfig.json`) still count:
they are authored files, not generated ones. If you would rather they did not,
`exclude_files` takes any Perl regex over filenames.

Two more things worth knowing:

- When `path` points at a directory containing `.git`, cloc also runs with
  `--vcs=git`, so files your `.gitignore` excludes are not counted.
- cloc is not on the GitHub-hosted Ubuntu images. The action installs it with
  `apt-get` on first use; on a self-hosted runner without `apt-get`, install
  cloc yourself and it will be used as-is.

This repository's own badge used to read ~32k, of which ~30k was the committed
action bundle. It now counts source only.

## Inputs

| Input          | Required | Default                                        | Description                                                                                                    |
| -------------- | -------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `path`         | No       | `.`                                            | Directory to analyze.                                                                                          |
| `output`       | No       | `dist/docs/loc.svg`                            | Path where the SVG badge is written.                                                                            |
| `font`         | No       | Bundled Monocraft                              | Path to a `.ttf`/`.otf` font file to use instead of the bundled font.                                            |
| `mascot`       | No       | Bundled LOChy artwork                          | Path to a `.png` mascot. Use your own image to ship a badge without the Lochy brand assets.                      |
| `outline_text` | No       | `true`                                         | `true` bakes every string to glyph outlines (identical rendering anywhere, larger file). `false` emits selectable `<text>` with a monospace fallback stack and adds `<title>`/`aria-label`. |
| `exclude`      | No       | `node_modules,vendor,bundle,build,dist,coverage` | Comma-separated directory names cloc must not count.                                                                 |
| `exclude_files`| No       | generated lock files                           | Perl regex over filenames cloc must not count. Set to a space to disable.                                              |
| `title`        | No       | `$GITHUB_REPOSITORY`                           | Badge title. Defaults to the repository name when left empty.                                                    |

## Colours

Bar hues come from [GitHub Linguist](https://github.com/github-linguist/linguist),
which is tuned for a light UI. The badge is a dark card, and several linguist
colours (`json`, `powershell`, `lua`, `ruby`) land within a few percent of the
bar track and used to render as blank slots. Every colour is now lifted toward
white until it clears a 3:1 contrast ratio against the track, keeping the
recognisable hue. Unknown languages fall back to a neutral grey that passes the
same rule.

## Text mode and accessibility

The default badge bakes text into outlines so it renders identically on every
machine with no font dependency. That makes the file opaque to screen readers
and to anything parsing the SVG, so set `outline_text: false` when you want a
badge whose total and per-language counts are readable `<text>`. Text mode is
a little smaller; the real size lever is `mascot` — the bundled LOChy PNG is
~436 KB and accounts for almost all of the file:

```yaml
- uses: nart4hire/LOCNess@v1
  with:
    outline_text: false
```

Both modes carry a `<title>` and an `aria-label` naming the repository and the
total.

## Public badges

GitHub Pages sites are public by default: once a badge is published there,
anyone with the URL can view it. Do not publish a badge if the repository name
or the lines-of-code total must stay private.

## License

This project is licensed under the AGPL-3.0-or-later, with a special exception
for generated output. The short version: a badge this program produces is yours
to publish, embed, and share — including the bundled mascot rendered inside it —
while the Lochy artwork as a standalone asset stays restricted. Point the
`mascot` input at your own image and the question does not arise.

- See [LICENSE](./LICENSE) for the AGPL text.
- See [LICENSE_EXCEPTION](./LICENSE_EXCEPTION) for the output exception.
- See [TRADEMARK](./TRADEMARK) for the mascot guidelines.