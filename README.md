# BLR Flat Hunt

**One search over Bangalore's rental portals.** → [blrflathunt.vercel.app](https://blrflathunt.vercel.app)

Finding a flat in Bangalore means keeping NoBroker and MagicBricks open in two tabs, seeing
the same 2BHK twice at two different rents, and doing the deposit maths in your head. This
does that work for you: every listing from both portals, deduplicated, searchable by
distance from wherever you actually need to be, and sorted by what it really costs to move in.

## What it does

**Search the way you think about it**
- Name a locality or drop a pin on the map, pick a radius, and see everything inside it —
  listings from every portal, on one map and one list.
- The same flat listed on both portals shows up once, with a note on where else it's
  listed and at what price — and a flag when it's cheaper there.

**Filter on what actually matters**
- Rent, BHK (1RK included), furnishing, property type, amenities, parking.
- **Owner-only** listings to skip brokerage.
- **Who the landlord will take** — family, bachelors, company lease.
- **Deposit capped in months** — hide anything asking more than, say, 3 months.
- **Walking distance to a Namma Metro station** — 500 m, 1 km or 1.5 km from any open station.
  Every card shows its nearest station.
- Available-by date, and which portal it came from.

**Sort by the real cost**
- **Move-in cost** — rent, deposit, maintenance and a month's brokerage if a broker listed it,
  so a cheap rent with a ten-month deposit doesn't fool you.
- Nearest, cheapest, newest, and combinations like *nearest · cheapest*.
- Rent cuts in the last two weeks are flagged on the card.

**Keep track without an account**
- Shortlist flats with one tap; it lives in your browser, no sign-up.
- Every apartment complex has its own page listing all of its units and their rent range,
  so you can see what a building actually goes for.
- Full-screen photo viewer, and every listing links straight to the original post.

## Chrome extension

On any NoBroker or MagicBricks listing, a small card shows whether the same flat is listed on the
other portal and at what price, the nearest metro station, the real move-in cost and recent rent drops.

1. Download `blr-flat-hunt-extension.zip` from the [latest release](https://github.com/AdityaKatare/blr-rentals/releases/latest) and unzip it.
2. Open `chrome://extensions` and switch on **Developer mode**.
3. Click **Load unpacked** and pick the unzipped `blr-flat-hunt-extension` folder.

## How it treats the portals

- Nobody's name, phone number or email is ever stored — only whether a listing is from an
  owner or a broker. To contact anyone you go to the original listing.
- Photos are shown from the portals' own servers, never copied.

Not affiliated with NoBroker, MagicBricks, or anyone else.
