# LORGUS Windows prototype (Unity)

An isolated Unity project scaffold for a future Windows desktop game. It does not replace the live web RPG and does not connect to Supabase yet.

## Current prototype scope

- Exactly **one bedroom**; no corridor, second room, or scene transition.
- First-person wake-up sequence: black overlay fades while the camera rises from bed height.
- Low-poly room dressing: bed and rumpled bedding, rug, bedside table and candle, wardrobe, chest, writing desk with a book, dark window, wall shelf and a locked door.
- Movement: **W** one tile forward, **S** one tile backward, **A/D** rotate 90 degrees.
- **E** interacts with room stations: desk (RP), wardrobe (inventory), bookcase (Lorebook), wall map (travel), blank mirror (character card/stats), trophy stand, and the guest door.
- **F** picks up or places supported movable props; carry them with W/S and turn with A/D.
- Basic collision against walls and furniture.
- Ambient audio and dust are decorative atmosphere only; there are no extra rooms, exits, or scripted scare events.
- Deliberately restrained lighting and geometry for the target desktop hardware.
- Procedural ambient sound: soft air through the window and subtle old-timber creaks, generated locally with no external audio files.
- Gentle candlelight fluctuation and sparse drifting dust motes to add life without expensive effects.
- Personal wall picture frame: load a PNG/JPG into the game save folder and reposition/zoom it inside the frame.
- Custom music: put a replacement track in the game save folder using the documented filename; local playback only, no uploads to a server.

## Player customization

Press **C** to open customization help. The game creates a writable `LORGUS` folder under Unity `Application.persistentDataPath`, with `Frames` and `Music` subfolders. Put an image named `frame.png` or `frame.jpg` in `Frames`; restart the game to load it. In customization mode, look directly at the wall frame, hold the left mouse button and drag to reposition the image; use the mouse wheel to zoom.

Put one replacement soundtrack in `Music` and name it `room.ogg`, `room.wav`, or `room.mp3`. Restart the game. If no supported track exists, a quiet original procedural fantasy-room music bed plays instead. Ambient room sounds continue separately. The actual save path varies by OS/user and is shown in the in-game help panel. Image files and music stay on the player computer.

The guest door currently exposes the intended visit interaction, but real visits to other players require online room data, identity/permissions and a network-backed guest list; that integration is not implemented in this local prototype yet. Room station panels are prototype interaction stubs, not live web-app screens. Movable props currently use a simple carry/place mechanic.

## Open locally

1. Install Unity Hub and the editor version in `ProjectSettings/ProjectVersion.txt`.
2. In Unity Hub choose **Add → Add project from disk**, then select this `unity-prototype` folder.
3. Open the project and allow Unity to import packages.
4. Open `Assets/Scenes/LorgusPrototype.unity` and press **Play**.

## Automated Windows build

The repository now has a real Unity compilation workflow at `.github/workflows/build-windows.yml`. It uses GameCI to build a Windows x86-64 Mono player and publishes a downloadable artifact named `LORGUS-Windows` containing `LORGUS-Windows.zip`. The structural validation workflow is separate and **does not compile Unity**.

### One-time Unity Personal license setup

A repository maintainer must complete these steps once before the cloud build can activate Unity Personal:

1. Install/open **Unity Hub** on a computer where you can sign in to your Unity account.
2. In Unity Hub, sign in and open **Licenses**.
3. Choose **Add license → Get a free Personal license**, accept the Personal terms, and activate it.
4. Export/download the license file in `.ulf` format. Unity Hub versions differ; if no export option is shown, follow Unity's official manual activation instructions for a Personal license and save the generated `.ulf` file.
5. Open the GitHub repository page: **Settings → Secrets and variables → Actions → New repository secret**.
6. Create these three secrets exactly:
   - `UNITY_LICENSE` — open the `.ulf` file in a plain-text editor, copy its complete contents, and paste them as the secret value.
   - `UNITY_EMAIL` — the email address of the Unity account that owns the activated Personal license.
   - `UNITY_PASSWORD` — that Unity account's password.
7. Save each secret. **Never put the license, email/password, or secret values into source files, commits, screenshots, or chat.** If Unity refuses reactivation in CI, follow current GameCI/Unity license guidance rather than sharing credentials elsewhere.

### Start the build and download the game

1. Open the repository's **Actions** tab.
2. Select **LORGUS Windows build**.
3. Click **Run workflow**, choose branch `unity/lorgus-windows-prototype`, and run it.
4. Open the newest run. A successful run must show the **Compile LORGUS for Windows (Mono)** job as successful and provide an artifact named **LORGUS-Windows**.
5. Download and extract `LORGUS-Windows.zip`. Keep `LORGUS.exe` and the entire `LORGUS_Data` folder together in the same directory; launch `LORGUS.exe`.

The workflow targets Unity `6000.0.60f1` and `StandaloneWindows64` using Mono, not IL2CPP. The official Unity release page lists Windows Mono build support for this editor version. If GameCI cannot resolve the image/module, use the actual error log to select a supported nearby Unity 6000.0.x version rather than guessing.

### Custom image and music limitations

The prototype attempts PNG/JPG image loading and OGG/WAV/MP3 audio loading from the user's local save directory. This code has not yet been verified in a Windows player. WAV and OGG are the preferred first formats to test; MP3 support may depend on codec/platform and must not be promised until verified. Current fallback music and ambience are generated procedurally and are not a separate soundtrack pack.

## Verification status

This is a prototype scaffold, not a finished game or verified executable. GitHub Actions checks project structure and basic text/JSON consistency; it does **not** compile Unity C# scripts or produce a Windows build. The project still needs a real Unity Editor run and play test before an EXE can honestly be called ready.

All changes stay on `unity/lorgus-windows-prototype` and must not be merged into `main` until reviewed and explicitly approved.
