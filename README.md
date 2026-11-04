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
      - uses: nart4hire/LOCNess@v1.0.0
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

## Inputs

| Input    | Required | Default               | Description                                                            |
| -------- | -------- | --------------------- | ---------------------------------------------------------------------- |
| `path`   | No       | `.`                   | Directory to analyze.                                                  |
| `output` | No       | `dist/docs/loc.svg`   | Path where the SVG badge is written.                                   |
| `font`   | No       | Bundled Monocraft     | Path to a `.ttf`/`.otf` font file to use instead of the bundled font.  |
| `title`  | No       | `$GITHUB_REPOSITORY`  | Badge title. Defaults to the repository name when left empty.          |

## Public badges

GitHub Pages sites are public by default: once a badge is published there,
anyone with the URL can view it. Do not publish a badge if the repository name
or the lines-of-code total must stay private.

## License

This project is licensed under the AGPL-3.0-or-later, with a special exception for generated output.

- See [LICENSE](./LICENSE) for the AGPL text.
- See [LICENSE_EXCEPTION](./LICENSE_EXCEPTION) for details about the output exception.
