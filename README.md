# Red Wing Pick of the Day

A single-page app that geolocates you, pulls today's forecast, and recommends your
top 3 Red Wing boots for the day from your 14-pair collection — with an outfit
suggestion for each. No build step, no server, no API keys.

## Running it

Open `index.html` directly in a browser, or serve the folder with any static
server (needed if your browser blocks `fetch`/geolocation on `file://`):

```bash
npx serve .
```

or

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Adding your boot photos

Drop images into `images/boots/` using these exact filenames (the page falls
back to a text placeholder until each one exists):

| Filename | Boot |
|---|---|
| `3343-blacksmith.jpg` | 3343 Blacksmith – Copper Rough & Tough |
| `3138-grey-chukka.jpg` | 3138 Grey Chukka – Rough & Tough |
| `4603-eg-copper-remix.jpg` | 4603 EG Copper Remix Oxford |
| `877-classic-moc.jpg` | 877 Classic Moc 8" – Oro Legacy |
| `8209-norway-moc.jpg` | 8209 Norway Moc – Oro Russet |
| `9422-beckman.jpg` | 9422 Beckman – Excalibur Cigar |
| `8089-iron-ranger.jpg` | 8089 Iron Ranger – Oro Legacy |
| `3110-eg-black-multi.jpg` | 3110 EG Black Multi Oxford |
| `8079-abilene-moc.jpg` | 8079 Shop Moc Oxford – Hawthorne Abilene |
| `3604-weekender.jpg` | 3604 Weekender Oxford – Copper Rough & Tough |
| `9215-oil-slick-chukka.jpg` | 9215 Oil Slick Chukka – Briar |
| `3194-chelsea.jpg` | 3194 Chelsea – Black Harness |
| `4070-postman.jpg` | 4070 Postman Oxford – Black |
| `3928-irish-setter.jpg` | 3928 Irish Setter Pull-On – Brown |

## How the daily pick works

`picker.js` scores every boot against today's temperature, precipitation/snow,
and its seasonal window (e.g. the Norway Moc only competes Nov–Mar), then adds
a weight favoring your higher-ranked boots. A small date-seeded jitter is
added so the #1 pick rotates among suitable boots instead of locking to the
same one every day.

## Background graphic

`styles.css` currently uses an original, simple line-art boot pattern (not a
real photo) tiled at 20% opacity, since pulling an actual Red Wing product
photo would raise copyright/trademark issues. Swap it for your own licensed
graphic by replacing the `background-image` data URI in `.bg-pattern` with a
path to your own image file.

## No Node/npm required

This was built as a dependency-free HTML/CSS/JS app (no React/Vite) because
this machine didn't have Node.js installed. If you later install Node and
want to migrate to React, the data (`boots.js`), weather logic
(`weather.js`), and pick algorithm (`picker.js`) are already separated out
and can be dropped into a React app largely as-is.
