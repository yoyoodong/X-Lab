# GitHub Pages Setup

The repository is ready for GitHub Pages as a static site.

Because this project is plain HTML, CSS, JavaScript, JSON, and images, it does not need a build step.

## Recommended Setup

Use GitHub's branch-based Pages deployment:

```text
Repository -> Settings -> Pages
```

Set:

```text
Source: Deploy from a branch
Branch: main
Folder: / (root)
```

Then save.

Expected site URL:

```text
https://yoyoodong.github.io/X-Lab/
```

## Netlify

The project can also be deployed on Netlify. If Netlify is connected to this GitHub repository, every push to `main` should trigger a new deploy.

Current known deployment:

```text
https://lab-x.netlify.app
```

## Runtime Requirement

The page reads `data.json` with `fetch()`. It should be served over HTTP by GitHub Pages, Netlify, or a local static server.

Direct `file://` opening may fail because browsers often block local JSON requests.
