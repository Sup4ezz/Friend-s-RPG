# LORGUS — Windows Unity prototype

This is an isolated prototype scaffold. It does not change the existing web game, Supabase, or production deployment.

## Target
- Unity 6 LTS, C#
- Windows x86-64 standalone build
- First-person, tile-based movement: W forward, S backward, A/D rotate 90 degrees
- Room geometry generated at runtime; no external assets required for the first test
- Local movement only; no network call per step

## Open in Unity
1. In Unity Hub, choose **Add > Add project from disk** and select this `unity-prototype` folder.
2. Open the project with the Unity 6 LTS editor version matching `ProjectSettings/ProjectVersion.txt`.
3. Open the scene `Assets/Scenes/LorgusPrototype.unity` and press Play.
4. Use W/S to move one tile and A/D to turn. Escape releases the cursor.

## Build a Windows EXE
In Unity: **File > Build Profiles > Windows > Build**. Choose an output folder outside this project. Unity produces an EXE and companion data folder; both must be kept together.

## Current scope
The first milestone is a self-contained performance baseline: a small room, grid movement, simple lighting, and animated turns/steps. It deliberately uses primitives and one lightweight material setup so performance can be measured before adding authored art. This is not yet connected to real authentication or Supabase, and it is not a finished game.

## Performance intent
- No physics simulation for basic grid movement.
- No runtime global illumination or heavy post-processing.
- Minimal dynamic lighting and geometry.
- Local input and collision checks; no request per movement.
- Measure on target hardware before increasing visual complexity.
