# Credits for the recipe videos

Every outside photo, model, texture, sound, piece of music, font, and voice in the videos, with its source and license. These need to appear on the recipe page before the video goes public. `assets.json` lists the Poly Haven files that `tools/fetch-assets.mjs` downloads.

## 3D models, textures, and lighting

All from [Poly Haven](https://polyhaven.com), under CC0 (public domain, no attribution required; credited here anyway).

| Asset | Used for | Author | Page |
| --- | --- | --- | --- |
| Wooden Cutting Board | The cutting board | Kuutti Siitonen | https://polyhaven.com/a/wooden_cutting_board |
| Yellow Onion | The onion on the board | Kuutti Siitonen | https://polyhaven.com/a/yellow_onion |
| Beige Wall 001 | The tabletop's surface (bumps and sheen) | Dimitrios Savva, Rico Cilliers | https://polyhaven.com/a/beige_wall_001 |
| Studio Small 09 | The studio lighting and reflections (HDRI) | Sergej Majboroda | https://polyhaven.com/a/studio_small_09 |

## Food photos

From [Unsplash](https://unsplash.com), under the [Unsplash License](https://unsplash.com/license): free to use and modify, credit appreciated but not required, and the photos may not be sold unaltered. Each page was checked on 2026-11-02, and none is Unsplash+. They are cut into textures by `tools/prepare_proof_assets.py` and `tools/prepare_textures.py`. To get a source file again, download `https://images.unsplash.com/photo-<ID>?w=2400&q=90&fm=jpg`.

| Photo | Used for | Photographer | Page | ID |
| --- | --- | --- | --- | --- |
| Crispy smashed potatoes on a baking sheet | The smashed potatoes (`public/textures/potato_*.png`) | Alpha Perspective (@alphaperspective) | https://unsplash.com/photos/crispy-smashed-potatoes-on-a-baking-sheet-Epim2rzorz8 | 1777229987480-d19f32acc68f |
| Grilled patties on grill | The patty crust and the steak's seared crust (`public/textures/patty.jpg`) | Maude Frédérique Lavoie (@maudefl) | https://unsplash.com/photos/grilled-patties-on-grill-haAhKtXcdgM | 1560951105-a23933755abc |
| Green leaf vegetable on brown wooden table | The romaine (`public/textures/leaf.png`) | Terry Jaskiw (@darkjett) | https://unsplash.com/photos/green-leaf-vegetable-on-brown-wooden-table-CU8MdyE4pG4 | 1612231653032-8a93d1de0834 |

Everything else (the bowl, tomato, onion, pickles, mushrooms, cheese, beans, cookware, and sauces) is modeled and painted in code.

Three more Unsplash photos went into the rejected 2D proof only, and none of them is in the 3D video:

- "White and brown mushrooms on brown wooden table" by Christina Rumpf (@rumpf), https://unsplash.com/photos/white-and-brown-mushrooms-on-brown-wooden-table-4NfqAqoQypc.
- "Round white ceramic bowl" by TAN Erica (@ericatan5566), https://unsplash.com/photos/round-white-ceramic-bowl-zCYO9HxEAjI.
- "A white plate topped with lettuce on top of a table" by 大胡子 (@menic), https://unsplash.com/photos/a-white-plate-topped-with-lettuce-on-top-of-a-table-4ZhdgUfjv9g. It was downloaded but never used.

## Sounds and music

From [Freesound](https://freesound.org), all under Creative Commons 0 (public domain), each checked on its own page on 2026-11-02. The public HQ MP3 previews are used. `assets.json` lists them, and `tools/fetch-assets.mjs` downloads them into `public/audio/`.

| Sound | Used for | Author | Page |
| --- | --- | --- | --- |
| Calm Background Music | The music under the narration | MrCatfishing | https://freesound.org/people/MrCatfishing/sounds/788347/ |
| frying steak.wav | The patties sizzling | simosco | https://freesound.org/people/simosco/sounds/235537/ |
| Mushrooms Frying | The mushrooms and onions in the pan | davidkay | https://freesound.org/people/davidkay/sounds/132472/ |
| Bread Crackling Cooling Fresh from Oven | The potatoes crisping | Erbsland-Music | https://freesound.org/people/Erbsland-Music/sounds/623368/ |
| Placing mashed potatoes on the plate | A soft plop as each sauce ingredient lands | MilanKovanda | https://freesound.org/people/MilanKovanda/sounds/377043/ |
| noodles - stir 02.wav | The spoon stirring the sauce | Anthousai | https://freesound.org/people/Anthousai/sounds/398773/ |

## Voice

- Narration: [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) v1.0, the `af_heart` voice, Apache 2.0, run locally with [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) (MIT).

## Fonts

From Google Fonts, under the SIL Open Font License 1.1.

- Instrument Serif: titles, captions, and labels.
- IBM Plex Mono: timers and small details.

## Software

- [Remotion](https://www.remotion.dev): free for individuals and companies of up to three people.
- [three.js](https://threejs.org), React Three Fiber, drei, and @react-three/postprocessing (all MIT), postprocessing (zlib), n8ao (ISC), and Rapier physics (Apache 2.0).
