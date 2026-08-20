# Session 0 language bridge

- `uniqueTags`: `flatMap` + `Set` to flatten and deduplicate tags.
- `topByCapacity`: spread copy + numeric `sort` + `slice`; the input is never mutated.
- `groupByVenue`: `reduce` into a venue-keyed object.
- `freeUpcoming`: `filter` then `map` to return titles only.

Run the JavaScript proof with `npm run lab:session0`.
