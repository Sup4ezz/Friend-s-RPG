# LORGUS Windows prototype (Unity)

This directory is an isolated Unity project scaffold for the future Windows desktop game. It does not replace the existing web RPG and does not connect to Supabase yet.

## Current prototype scope

- A simple first-person bedroom assembled from primitive geometry at runtime.
- Grid-based movement: **W** one tile forward, **S** one tile backward, **A/D** rotate by 90 degrees.
- Basic collision against room geometry.
- A black-screen wake-up sequence that fades in as the camera rises from bed height.
- A lightweight 60 FPS target and deliberately simple lighting.

## Open locally

1. Install Unity Hub and the Unity editor version specified in `ProjectSettings/ProjectVersion.txt`.
2. In Unity Hub choose **Add → Add project from disk**, then select this `unity-prototype` folder.
3. Open the project and let Unity import packages.
4. Open `Assets/Scenes/LorgusPrototype.unity` and press **Play**.

If input does not respond, check Unity's **Active Input Handling** setting. The current controller uses Unity's legacy `Input.GetKeyDown` API.

## Windows build

After the project opens and runs without errors, use **File → Build Profiles** (or **Build Settings**, depending on the installed Unity version), select **Windows**, add the prototype scene to the build, and build to a separate output folder.

## Verification status

This is a prototype scaffold, not a finished game or a verified executable. GitHub Actions performs structural checks only; it does **not** compile Unity C# scripts or produce a Windows build. The project must still be opened in the Unity editor and tested before an EXE can honestly be called ready.

The prototype is isolated on the `unity/lorgus-windows-prototype` branch and must not be merged into `main` until reviewed and explicitly approved.
