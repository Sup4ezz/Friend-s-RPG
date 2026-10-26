using UnityEngine;

namespace Lorgus.Prototype
{
    /// <summary>
    /// Builds a tiny test room at runtime so the first prototype needs no imported art.
    /// This is a performance baseline, not final LORGUS art.
    /// </summary>
    public sealed class LorgusPrototypeBootstrap : MonoBehaviour
    {
        private static readonly Color WallColor = new Color(0.16f, 0.14f, 0.13f);
        private static readonly Color FloorColor = new Color(0.20f, 0.18f, 0.16f);
        private static readonly Color WoodColor = new Color(0.24f, 0.15f, 0.09f);

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void EnsureBootstrap()
        {
            if (FindObjectOfType<LorgusPrototypeBootstrap>() != null) return;
            var root = new GameObject("LORGUS Prototype Runtime");
            root.AddComponent<LorgusPrototypeBootstrap>();
        }

        private void Awake()
        {
            Application.targetFrameRate = 60;
            QualitySettings.vSyncCount = 1;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
            BuildRoom();
            BuildPlayer();
            BuildLighting();
            BuildIntroLabel();
        }

        private static Material MakeMaterial(Color color)
        {
            var shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) shader = Shader.Find("Standard");
            var material = new Material(shader) { color = color };
            return material;
        }

        private void BuildRoom()
        {
            var floor = MakeMaterial(FloorColor);
            var wall = MakeMaterial(WallColor);
            var wood = MakeMaterial(WoodColor);

            CreateBlock("Stone floor", new Vector3(0, -0.15f, 0), new Vector3(8, 0.3f, 8), floor);
            CreateBlock("Back wall", new Vector3(0, 1.5f, 4), new Vector3(8, 3, 0.25f), wall);
            CreateBlock("Left wall", new Vector3(-4, 1.5f, 0), new Vector3(0.25f, 3, 8), wall);
            CreateBlock("Right wall", new Vector3(4, 1.5f, 0), new Vector3(0.25f, 3, 8), wall);
            CreateBlock("Front wall left", new Vector3(-2.5f, 1.5f, -4), new Vector3(3, 3, 0.25f), wall);
            CreateBlock("Front wall right", new Vector3(2.5f, 1.5f, -4), new Vector3(3, 3, 0.25f), wall);
            CreateBlock("Door lintel", new Vector3(0, 2.7f, -4), new Vector3(2, 0.6f, 0.25f), wood);

            // Bed and bedside table are static, low-poly blockers.
            CreateBlock("Bed frame", new Vector3(-1.6f, 0.35f, 1.1f), new Vector3(2.2f, 0.45f, 1.5f), wood);
            CreateBlock("Bed mattress", new Vector3(-1.6f, 0.62f, 1.1f), new Vector3(2.05f, 0.18f, 1.35f), MakeMaterial(new Color(0.36f, 0.33f, 0.29f)));
            CreateBlock("Bedside table", new Vector3(0.2f, 0.45f, 1.5f), new Vector3(0.55f, 0.8f, 0.55f), wood);
        }

        private void BuildPlayer()
        {
            var player = new GameObject("Player");
            player.transform.position = new Vector3(0.5f, 0, -1.5f);
            var cameraObject = new GameObject("First Person Camera");
            cameraObject.transform.SetParent(player.transform, false);
            cameraObject.transform.localPosition = new Vector3(0, 1.65f, 0);
            cameraObject.transform.localRotation = Quaternion.identity;
            var camera = cameraObject.AddComponent<Camera>();
            camera.fieldOfView = 72;
            camera.nearClipPlane = 0.08f;
            camera.farClipPlane = 35;
            camera.backgroundColor = new Color(0.035f, 0.03f, 0.025f);
            cameraObject.AddComponent<AudioListener>();
            player.AddComponent<GridFirstPersonController>();
        }

        private void BuildLighting()
        {
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.13f, 0.12f, 0.11f);
            var lightObject = new GameObject("Warm room light");
            lightObject.transform.position = new Vector3(0, 2.65f, 0.5f);
            var light = lightObject.AddComponent<Light>();
            light.type = LightType.Point;
            light.color = new Color(1f, 0.72f, 0.43f);
            light.intensity = 2.0f;
            light.range = 7f;
            light.shadows = LightShadows.None;
        }

        private void BuildIntroLabel()
        {
            var ui = new GameObject("Prototype HUD");
            var canvas = ui.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            ui.AddComponent<UnityEngine.UI.CanvasScaler>();
            ui.AddComponent<UnityEngine.UI.GraphicRaycaster>();

            var overlayObject = new GameObject("Eyes opening overlay");
            overlayObject.transform.SetParent(canvas.transform, false);
            var overlay = overlayObject.AddComponent<UnityEngine.UI.Image>();
            overlay.color = Color.black;
            overlay.raycastTarget = false;
            var overlayRect = overlay.rectTransform;
            overlayRect.anchorMin = Vector2.zero;
            overlayRect.anchorMax = Vector2.one;
            overlayRect.offsetMin = Vector2.zero;
            overlayRect.offsetMax = Vector2.zero;
            var wakeSequence = ui.AddComponent<WakeUpSequence>();
            // Bind the overlay through a small public setter to keep the sequence self-contained.
            wakeSequence.SetOverlay(overlay);

            var labelObject = new GameObject("Controls");
            labelObject.transform.SetParent(canvas.transform, false);
            var label = labelObject.AddComponent<UnityEngine.UI.Text>();
            label.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            label.fontSize = 18;
            label.color = new Color(0.84f, 0.78f, 0.68f);
            label.alignment = TextAnchor.LowerLeft;
            label.text = "LORGUS  |  ПРОТОТИП\nW / S — шаг  •  A / D — поворот на 90°  •  Esc — курсор";
            var rect = label.rectTransform;
            rect.anchorMin = new Vector2(0, 0);
            rect.anchorMax = new Vector2(1, 0);
            rect.pivot = new Vector2(0, 0);
            rect.anchoredPosition = new Vector2(24, 20);
            rect.sizeDelta = new Vector2(-48, 64);
        }

        private static void CreateBlock(string name, Vector3 position, Vector3 scale, Material material)
        {
            var block = GameObject.CreatePrimitive(PrimitiveType.Cube);
            block.name = name;
            block.transform.position = position;
            block.transform.localScale = scale;
            block.GetComponent<Renderer>().sharedMaterial = material;
            // Primitive cube collider provides static wall/furniture geometry.
        }
    }
}
