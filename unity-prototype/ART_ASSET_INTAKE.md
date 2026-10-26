# LORGUS room art pass — approved asset intake

Target branch: `unity/lorgus-windows-prototype`  
Production protection: do not merge PR #15 or touch `main`, the live website, or Supabase.

## First-pass assets (all CC0)

Poly Haven states that all assets in its library are CC0 and may be used for any purpose without an account or paywall: https://polyhaven.com/about-contact

| Room role | Asset | Official page | Notes |
|---|---|---|---|
| Bed / wake-up focal point | Gothic Bed 01 | https://polyhaven.com/a/GothicBed_01 | 2 m wide, 19K triangles; best visual anchor |
| Wardrobe / storage | Gothic Cabinet 01 | https://polyhaven.com/a/GothicCabinet_01 | 2.4 m tall, carved panels and worn wood |
| Secondary storage | Gothic Commode 01 | https://polyhaven.com/a/GothicCommode_01 | 1.2 m tall, 4K triangles |
| Writing desk | Wooden Table 01 | https://polyhaven.com/a/WoodenTable_01 | 1.8 m wide, worn timber; use for RP interaction |
| Light prop | Wooden Lantern 01 | https://polyhaven.com/a/wooden_lantern_01 | 0.5 m tall; use as visible lantern prop |
| Material: old wood | Wood Table | https://polyhaven.com/a/wood_table | CC0 PBR texture; 2K is a sensible starting size |

For wall material, choose a worn plaster or rough stone material from the official CC0 catalog:
- https://polyhaven.com/textures/stone
- https://polyhaven.com/textures/wood
- https://ambientcg.com/list?category=Plaster

## Download/import rules

1. Prefer **FBX** for models and **PNG/JPG** texture maps at 2K for the first build. Keep the downloaded ZIPs outside the Unity project; extract only the model and maps actually needed.
2. Put each model and its textures together under:
   - `unity-prototype/Assets/Art/Models/GothicBed01/`
   - `unity-prototype/Assets/Art/Models/GothicCabinet01/`
   - `unity-prototype/Assets/Art/Models/GothicCommode01/`
   - `unity-prototype/Assets/Art/Models/WoodenTable01/`
   - `unity-prototype/Assets/Art/Models/WoodenLantern01/`
   - `unity-prototype/Assets/Art/Materials/WoodTable/`
3. Keep the original asset names and texture maps; do not flatten them into one folder. Use the DirectX normal map for Unity when both DirectX and OpenGL versions are provided.
4. Do not commit 8K maps, EXR maps, Blender caches, or full duplicate archives for the initial pass. We can increase quality after checking the scene and build size.
5. Once assets are committed to this branch, the Unity integration pass will replace the cube bed/cabinet/desk/lantern props, fit scale/orientation/colliders, and preserve all existing interaction roles and one-room movement.

## Quality gate

No asset is considered integrated until it is imported in Unity, visible in a Windows player build, and checked for missing materials, pink shaders, scale/orientation errors, collision issues, and frame-time impact on the target GTX 1660 Super / i3-10105F. The current cube geometry remains a temporary fallback until real model files are present.
