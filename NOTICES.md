# Product image credits & licences

The eight product-card photographs in `client/public/img/products/` are **real
photographs sourced from Wikimedia Commons**, downloaded on 21 October 2026 and
re-encoded to 1200×900 WebP (cover-crop via `sharp`) for the storefront cards.
They replace the earlier generated placeholder art.

They are **not** official Metro Lahore Kites product photos, and they were **not**
copied from any retailer site (lahorekites.com, kite.com.pk, basantshop.com or
similar). Each image is reproduced here under the free licence stated below.
If you replace any of these files with your own product photography, remove the
corresponding row from this table.

| Card image | Commons file | Author | Licence |
| --- | --- | --- | --- |
| `patang-classic.webp` | [File:Kite, Indian model.jpg](https://commons.wikimedia.org/wiki/File:Kite,_Indian_model.jpg) | Sidheeq | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| `patang-premium.webp` | [File:20191215 Kite playing in Pushkar 1228 8785.jpg](https://commons.wikimedia.org/wiki/File:20191215_Kite_playing_in_Pushkar_1228_8785.jpg) | Jakub Hałun | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `gudda.webp` | [File:Huge kites and people watching at the Sydney Kite Festival.jpg](https://commons.wikimedia.org/wiki/File:Huge_kites_and_people_watching_at_the_Sydney_Kite_Festival.jpg) | Sheminghui.WU | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| `dor-pinna.webp` | [File:Kite reel ku.jpg](https://commons.wikimedia.org/wiki/File:Kite_reel_ku.jpg) | কুউ পুলক (Ku Pulok) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `kite-dor-kit.webp` | [File:Kite reel - img39281.jpg](https://commons.wikimedia.org/wiki/File:Kite_reel_-_img39281.jpg) | Pmau | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `gloves.webp` | [File:Two pairs of mens leather gloves from Randers Handsker.jpg](https://commons.wikimedia.org/wiki/File:Two_pairs_of_mens_leather_gloves_from_Randers_Handsker.jpg) | Toxophilus | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `tape.webp` | [File:Adhesive tapes clear.JPG](https://commons.wikimedia.org/wiki/File:Adhesive_tapes_clear.JPG) | BarberJP | Public domain |
| `bag.webp` | [File:Cricket kit bag at Epping Foresters Cricket Club 1.jpg](https://commons.wikimedia.org/wiki/File:Cricket_kit_bag_at_Epping_Foresters_Cricket_Club_1.jpg) | Acabashi | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |

## Licence obligations

- **CC BY / CC BY-SA images** require attribution (author name + licence) and,
  for CC BY-SA, that any adapted version of the photograph is shared under the
  same licence. The table above and this file satisfy attribution for this
  repository; if you deploy the site publicly, keep a visible credit (for
  example in the footer or an `/credits` page) or link to this file.
- The **public-domain** image has no licence obligations but is credited above
  for completeness.

## Note for maintainers

`npm run generate:images` (see `scripts/generate-images.mjs`) regenerates the
**placeholder** artwork and writes to the same
`client/public/img/products/*.webp` paths. **Running it will overwrite these
photographs.** Only run it if you intentionally want the generated placeholders
back; restore the photos afterwards from version control.
