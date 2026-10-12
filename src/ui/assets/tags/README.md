# Tag-location artwork

Product images showing where the NFC tag sits on each device, shown by
`TagLocationHint` once a read has identified the sensor.

## What goes here

| File        | Device type     | Shows                                                                                                           |
| ----------- | --------------- | --------------------------------------------------------------------------------------------------------------- |
| `uc501.png` | `idol53`        | The **UC501 controller** — the iDOL53's tag is on the controller, not on the DOL53 ammonia sensor wired into it |
| `em500.png` | `em500-co2-t-h` | EM500-CO2-T-H                                                                                                   |
| `em300.png` | `em300-th`      | EM300-TH                                                                                                        |

Add `@2x` and `@3x` variants beside each (`uc501@2x.png`, `uc501@3x.png`) —
Metro picks the right density automatically from the base filename.

Rendered at 52×52 points, so roughly 156×156 px at `@3x`. Square, with the
device on a transparent or near-white ground.

## Where they come from

Milesight's product artwork. One request to them covers all three device types,
including the iDOL53, since the part being tapped is a UC501. Do not lift the
images out of their PDFs or website — ask for the assets.

## Wiring a file up

Dropping a file here is not enough; Metro resolves image paths literally. Add
the line to `ARTWORK` in `src/ui/components/TagLocationHint.tsx`:

```ts
const ARTWORK: Record<string, ImageSourcePropType> = {
  uc501: require('../assets/tags/uc501.png'),
};
```

Keys match `artworkKey` in `TAG_LOCATIONS` (`src/domain/device.ts`).

## Until then

`TagLocationHint` renders its caption alone. That is the designed fallback
rather than a broken state — the sentence is the part that has to be correct,
and the iDOL53's caption in particular does work no picture can, by telling
someone holding a two-part article which half carries the tag.
