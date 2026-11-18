# TomahawkTito

A small photo and video site for Tomahawk Tito, published with GitHub Pages.

## Update the ribbon

Edit `gallery.xml`. Each `<item>` has two fields:

- `<src>` — where the picture or video lives, usually a file in `media/`
- `<caption>` — optional text shown under that item

Put new files in `media/`, then point `<src>` at them, for example `media/yard.jpg`.

## Publish

Push this folder to GitHub, then in the repository open Settings, Pages, and set the source to the `main` branch and the root folder.
