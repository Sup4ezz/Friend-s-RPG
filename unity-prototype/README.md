# LORGUS Windows game prototype (Unity)

This is an isolated Unity Windows-game project for the LORGUS literary RP platform. It is not the live web application and does not replace it. All development stays on unity/lorgus-windows-prototype; do not merge PR #15 or change production without explicit approval.

## Confirmed game concept

- Standalone Windows launch.
- Interactive cosmic login scene with stars, planets and constellations.
- Login form with “ЗАПОМНИТЬ ДАННЫЕ” (“Remember credentials”).
- After sign-in, the client must verify that the player's character application is approved. If more than one character is approved, the player chooses which character to enter as.
- Every successful entry with an approved character starts a fresh first-person wake-up sequence. Remembering credentials must not skip waking up.
- Wake-up visuals are designed for the game; do not copy the website's eye-opening animation literally.
- After waking, the player explores one spacious room in first person using WASD + mouse look.
- Approach an object and press E to interact.
- Room objects: bed, chest, writing desk, mirror with no reflection, stove with a cauldron, outside door, and a window whose view reflects the character's current RP location.
- Mirror opens the character screen; desk opens the existing mail system; chest opens the existing inventory.
- Non-RP interfaces appear as overlays on the 3D scene. RP has a separate full-screen placeholder; its real feed and posting are not integrated.
- Art direction: stylized models combined with cinematic lighting, tuned to one coherent asset style.
- The user owns the music direction and selection. Do not invent, generate or add a soundtrack independently.

## Scope boundaries

Do not add unapproved combat, levels, XP, quests, NPCs, extra rooms, wall maps, interactive bookcases, trophy stands, guest visits, prop carrying, picture customization, or other speculative features. These were present in earlier prototype notes but are not confirmed requirements.

Do not treat local interaction stubs as working live systems. Real Supabase auth, approval checks, mail, inventory, character data, RP location, and contextual window views are not yet verified as integrated. Do not store passwords in plaintext or include privileged keys in the Windows client.

## Current prototype status

The repository contains a Unity scaffold, cosmic login/register code using Supabase Auth, an approval gate, DPAPI-protected refresh-token persistence for Windows, a first-person controller, a bed-to-standing wake-up sequence, code for mapping existing FBX models and basic room lighting. This is not a finished game or a verified executable. Unity Editor/Play Mode, material import, C# compilation, real-account Supabase/RLS behavior and the Windows build have not yet been confirmed. The structural validation workflow does not compile Unity.

The current environment pack contains props, not a confirmed humanoid rig and wake-up/walking animation set. The window view is now built from read-only RP presence for the selected character, with region-specific procedural silhouettes; it is not yet visually verified in Unity. Do not claim these are complete until the assets are found or created and tested.

## Open locally

1. Install Unity Hub and the editor version in ProjectSettings/ProjectVersion.txt.
2. In Unity Hub choose Add → Add project from disk and select unity-prototype.
3. Open Assets/Scenes/LorgusPrototype.unity and press Play.
4. Check the Unity Console and record actual results; do not infer a successful run from file presence.

## Windows build

The repository has a GitHub Actions workflow at .github/workflows/build-windows.yml. A successful structural check is not a Windows build. The executable is not considered ready until the Unity compilation workflow succeeds and the resulting EXE is tested on Windows.

## Checklist

See LORGUS_CHECKLIST.md and ART_ASSET_INTAKE.md for confirmed requirements, architecture constraints, remaining work, and verification criteria.


## How to check the current prototype

### Option 1 — Windows build from GitHub Actions

1. Open [LORGUS Windows build](https://github.com/Sup4ezz/Friend-s-RPG/actions/workflows/build-windows.yml).
2. Open the newest run for the Unity prototype branch. Wait until it says **Success**; while it is queued or running, no downloadable build is ready.
3. In the successful run, find **Artifacts → LORGUS-Windows** and download `LORGUS-Windows.zip`. Artifacts are retained for 14 days.
4. Extract the entire ZIP into a folder and run `LORGUS.exe`. Do not copy only the EXE; Unity needs `UnityPlayer.dll` and the complete `LORGUS_Data` folder.
5. Sign in with a test account that has an approved character application. A pending/rejected application must not enter the room. Test the “ЗАПОМНИТЬ ДАННЫЕ” checkbox, character selection (if multiple approved characters), WASD + mouse, E interactions, Escape/Close, and the changing window view.

### Option 2 — Unity Editor

1. Clone/download branch `unity/lorgus-windows-prototype`.
2. In Unity Hub choose **Add → Add project from disk** and select `unity-prototype`.
3. Open `Assets/Scenes/LorgusPrototype.unity` and press **Play**.
4. Check the Console for errors, then repeat the same gameplay checks. The current source still needs this visual/Play Mode verification.

### Automated checks

- [Structural validation](https://github.com/Sup4ezz/Friend-s-RPG/actions/workflows/lorgus-unity-prototype-check.yml) checks required files and implementation guardrails. It does **not** compile Unity.
- [Windows build](https://github.com/Sup4ezz/Friend-s-RPG/actions/workflows/build-windows.yml) compiles the Unity project and packages a Windows player.
- Use [PR #15](https://github.com/Sup4ezz/Friend-s-RPG/pull/15) to review all changes. Do not merge it until the Windows build succeeds and the game is tested.

