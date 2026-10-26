# LORGUS Windows prototype (Unity)

An isolated Unity project scaffold for a future Windows desktop game. It does not replace the live web RPG and does not connect to Supabase yet.

## Current prototype scope

- Exactly **one bedroom**; no corridor, second room, or scene transition.
- First-person wake-up sequence: black overlay fades while the camera rises from bed height.
- Low-poly room dressing: bed and rumpled bedding, rug, bedside table and candle, wardrobe, chest, writing desk with a book, dark window, wall shelf and a locked door.
- Movement: **W** one tile forward, **S** one tile backward, **A/D** rotate 90 degrees.
- **E** inspects an object when it is in front of the player; an in-world text description appears.
- Basic collision against walls and furniture.
- Ambient audio and dust are decorative atmosphere only; there are no extra rooms, exits, or scripted scare events.
- Deliberately restrained lighting and geometry for the target desktop hardware.
- Procedural ambient sound: soft air through the window and subtle old-timber creaks, generated locally with no external audio files.
- Gentle candlelight fluctuation and sparse drifting dust motes to add life without expensive effects.

The door is scenery only. It does not lead anywhere. Inspectable objects currently provide narrative text, not inventory or quest progression.

## Open locally

1. Install Unity Hub and the editor version in `ProjectSettings/ProjectVersion.txt`.
2. In Unity Hub choose **Add → Add project from disk**, then select this `unity-prototype` folder.
3. Open the project and allow Unity to import packages.
4. Open `Assets/Scenes/LorgusPrototype.unity` and press **Play**.

The controller uses Unity's legacy `Input.GetKeyDown` API. If keyboard input is disabled by project defaults, set **Active Input Handling** to **Input Manager (Old)** or **Both** in Player settings.

## Windows build

Only after the project opens and runs without errors, use **File → Build Profiles** (or **Build Settings**, depending on Unity version), select Windows, include the prototype scene, and build to a separate output folder.

## Verification status

This is a prototype scaffold, not a finished game or verified executable. GitHub Actions checks project structure and basic text/JSON consistency; it does **not** compile Unity C# scripts or produce a Windows build. The project still needs a real Unity Editor run and play test before an EXE can honestly be called ready.

All changes stay on `unity/lorgus-windows-prototype` and must not be merged into `main` until reviewed and explicitly approved.
