using UnityEngine;
using UnityEngine.UI;

namespace Lorgus.Prototype
{
    /// <summary>Builds one small, richly dressed bedroom using inexpensive geometry.</summary>
    public sealed class LorgusPrototypeBootstrap : MonoBehaviour
    {
        private static readonly Color WallColor = new Color(0.16f, 0.13f, 0.11f);
        private static readonly Color FloorColor = new Color(0.19f, 0.16f, 0.13f);
        private static readonly Color WoodColor = new Color(0.22f, 0.13f, 0.075f);
        private static readonly Color BrassColor = new Color(0.42f, 0.29f, 0.12f);
        private static readonly Color ClothColor = new Color(0.28f, 0.10f, 0.075f);

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
            gameObject.AddComponent<RoomAtmosphere>();
            BuildUI();
        }

        private static Material MakeMaterial(Color color)
        {
            Shader shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) shader = Shader.Find("Standard");
            return new Material(shader) { color = color };
        }

        private void BuildRoom()
        {
            Material floor = MakeMaterial(FloorColor);
            Material wall = MakeMaterial(WallColor);
            Material wood = MakeMaterial(WoodColor);
            Material brass = MakeMaterial(BrassColor);
            Material cloth = MakeMaterial(ClothColor);
            Material linen = MakeMaterial(new Color(0.49f, 0.43f, 0.34f));
            Material stone = MakeMaterial(new Color(0.025f, 0.02f, 0.018f));

            CreateBlock("Stone floor", new Vector3(0, -0.15f, 0), new Vector3(8, 0.3f, 8), floor);
            CreateBlock("Back wall", new Vector3(0, 1.5f, 4), new Vector3(8, 3, 0.25f), wall);
            CreateBlock("Left wall", new Vector3(-4, 1.5f, 0), new Vector3(0.25f, 3, 8), wall);
            CreateBlock("Right wall", new Vector3(4, 1.5f, 0), new Vector3(0.25f, 3, 8), wall);
            CreateBlock("Front wall left", new Vector3(-2.5f, 1.5f, -4), new Vector3(3, 3, 0.25f), wall);
            CreateBlock("Front wall right", new Vector3(2.5f, 1.5f, -4), new Vector3(3, 3, 0.25f), wall);
            CreateBlock("Door lintel", new Vector3(0, 2.7f, -4), new Vector3(2, 0.6f, 0.25f), wood);
            AddInteractable("Door leaf", "Дверь соседей", "Дубовая дверь ведёт во двор, откуда можно будет отправиться в гости к другим персонажам.", new Vector3(0, 1.15f, -3.91f), new Vector3(1.7f, 2.3f, 0.08f), wood, RoomObjectRole.VisitDoor, false);
            CreateBlock("Door crossbar", new Vector3(0, 1.25f, -3.84f), new Vector3(1.3f, 0.08f, 0.035f), brass);
            CreateBlock("Door handle", new Vector3(0.55f, 1.15f, -3.79f), new Vector3(0.07f, 0.07f, 0.07f), brass);

            // Bed and bedding.
            CreateBlock("Bed frame", new Vector3(-1.65f, 0.28f, 1.1f), new Vector3(2.25f, 0.38f, 1.55f), wood);
            CreateBlock("Bed mattress", new Vector3(-1.65f, 0.52f, 1.1f), new Vector3(2.12f, 0.18f, 1.43f), linen);
            CreateBlock("Rumpled blanket", new Vector3(-1.65f, 0.64f, 1.42f), new Vector3(2.08f, 0.08f, 0.72f), cloth);
            CreateBlock("Pillow", new Vector3(-1.65f, 0.65f, 0.63f), new Vector3(0.7f, 0.12f, 0.35f), linen);
            AddInteractable("Bed inspection", "Постель", "Простыни сбились в складки. Похоже, вы провели здесь немало времени — или проснулись резко.", new Vector3(-1.65f, 0.74f, 1.1f), new Vector3(2.1f, 0.16f, 1.4f), linen);

            // Rug, bedside table and candle.
            CreateBlock("Woven rug", new Vector3(0.15f, 0.015f, 0.35f), new Vector3(2.15f, 0.025f, 2.7f), cloth);
            CreateBlock("Rug central pattern", new Vector3(0.15f, 0.032f, 0.35f), new Vector3(0.12f, 0.01f, 2.35f), brass);
            CreateBlock("Bedside table", new Vector3(0.05f, 0.42f, 1.55f), new Vector3(0.58f, 0.78f, 0.58f), wood);
            CreateBlock("Table drawer", new Vector3(0.05f, 0.48f, 1.245f), new Vector3(0.42f, 0.18f, 0.035f), brass);
            CreateBlock("Candle", new Vector3(0.05f, 0.88f, 1.55f), new Vector3(0.08f, 0.18f, 0.08f), linen);
            CreateBlock("Candle flame", new Vector3(0.05f, 1.005f, 1.55f), new Vector3(0.035f, 0.07f, 0.035f), brass);
            AddInteractable("Table inspection", "Письменный стол", "Здесь персонаж сможет читать и писать RP-сообщения.", new Vector3(-2.8f, 0.95f, -2.6f), new Vector3(1.65f, 0.12f, 0.8f), wood, RoomObjectRole.RpMessages, true);

            // Wardrobe and chest.
            CreateBlock("Wardrobe body", new Vector3(3.05f, 1.05f, 1.45f), new Vector3(1.2f, 2.1f, 0.75f), wood);
            CreateBlock("Wardrobe left panel", new Vector3(2.76f, 1.05f, 1.05f), new Vector3(0.5f, 1.8f, 0.04f), brass);
            CreateBlock("Wardrobe right panel", new Vector3(3.34f, 1.05f, 1.05f), new Vector3(0.5f, 1.8f, 0.04f), brass);
            CreateBlock("Wardrobe handles", new Vector3(3.05f, 1.0f, 1.015f), new Vector3(0.06f, 0.22f, 0.05f), brass);
            AddInteractable("Wardrobe inspection", "Шкаф — инвентарь", "Здесь хранится инвентарь персонажа.", new Vector3(3.05f, 1.05f, 1.45f), new Vector3(1.2f, 2.1f, 0.75f), wood, RoomObjectRole.Inventory, false);

            CreateBlock("Storage chest", new Vector3(2.95f, 0.38f, -0.2f), new Vector3(1.15f, 0.72f, 0.75f), wood);
            CreateBlock("Chest lid", new Vector3(2.95f, 0.77f, -0.2f), new Vector3(1.18f, 0.1f, 0.78f), brass);
            AddInteractable("Chest inspection", "Сундук", "Замок сорван, но крышка не поддаётся. В щели застрял клочок бумаги.", new Vector3(2.95f, 0.42f, -0.2f), new Vector3(1.15f, 0.8f, 0.75f), wood);

            // Writing desk, book and the dark window.
            CreateBlock("Writing desk top", new Vector3(-2.8f, 0.95f, -2.6f), new Vector3(1.65f, 0.12f, 0.8f), wood);
            CreateBlock("Desk left leg", new Vector3(-3.45f, 0.45f, -2.6f), new Vector3(0.12f, 0.9f, 0.12f), wood);
            CreateBlock("Desk right leg", new Vector3(-2.15f, 0.45f, -2.6f), new Vector3(0.12f, 0.9f, 0.12f), wood);
            AddInteractable("Open book", "Книжный шкаф — Лорбук", "Летописи, легенды и сведения о мире собраны в одном месте.", new Vector3(2.8f, 2.15f, 3.62f), new Vector3(1.45f, 0.1f, 0.38f), wood, RoomObjectRole.Lorebook, false);
            CreateBlock("Book spine", new Vector3(-2.8f, 1.065f, -2.58f), new Vector3(0.035f, 0.015f, 0.42f), brass);

            CreateBlock("Window frame", new Vector3(0, 1.95f, 3.84f), new Vector3(1.7f, 1.35f, 0.12f), wood);
            AddInteractable("Window inspection", "Окно", "За стеклом — непроглядная темнота. Ни огней, ни силуэтов, ни даже отражения комнаты.", new Vector3(0, 1.95f, 3.76f), new Vector3(1.45f, 1.1f, 0.04f), stone);
            CreateBlock("Window vertical bar", new Vector3(0, 1.95f, 3.71f), new Vector3(0.06f, 1.12f, 0.04f), brass);
            CreateBlock("Window horizontal bar", new Vector3(0, 1.95f, 3.71f), new Vector3(1.48f, 0.06f, 0.04f), brass);

            CreateBlock("Wall shelf", new Vector3(2.8f, 2.15f, 3.62f), new Vector3(1.45f, 0.1f, 0.38f), wood);
            for (int i = 0; i < 5; i++)
                CreateBlock("Shelf book " + i, new Vector3(2.28f + i * 0.23f, 2.36f, 3.65f), new Vector3(0.18f, 0.34f + (i % 2) * 0.08f, 0.24f), i % 2 == 0 ? cloth : brass);
                        AddInteractable("World map", "Карта мира", "Карта на стене — точка выбора доступного места для перемещения.", new Vector3(-1.65f, 2.0f, 3.78f), new Vector3(1.1f, 1.25f, 0.05f), wood, RoomObjectRole.WorldMap, false);
            AddInteractable("Empty mirror", "Зеркало без отражения", "Зеркало не отражает ваше лицо. Здесь будут карточка персонажа и статистика.", new Vector3(1.65f, 1.95f, 3.78f), new Vector3(0.75f, 1.25f, 0.06f), brass, RoomObjectRole.CharacterMirror, false);
            AddInteractable("Trophy stand", "Стенды для предметов", "Выставляйте предметы, которыми хотите похвастаться перед гостями.", new Vector3(-3.0f, 0.9f, 0.3f), new Vector3(0.8f, 0.9f, 0.6f), wood, RoomObjectRole.TrophyStand, true);
            var pictureFrame = CreateBlock("Personal picture frame", new Vector3(-3.1f, 2.0f, 3.78f), new Vector3(0.9f, 0.9f, 0.06f), brass);
            var picture = CreateBlock("Personal picture surface", new Vector3(-3.1f, 2.0f, 3.735f), new Vector3(0.78f, 0.78f, 0.025f), linen);
            var customization = gameObject.AddComponent<RoomCustomization>();
            customization.Initialize(picture.GetComponent<Renderer>());
AddInteractable("Empty mirror", "Зеркало без отражения", "Зеркало не отражает ваше лицо. Здесь будут карточка персонажа и статистика.", new Vector3(1.65f, 1.95f, 3.78f), new Vector3(0.75f, 1.25f, 0.06f), brass, RoomObjectRole.CharacterMirror, false);
AddInteractable("Trophy stand", "Стенды для предметов", "Выставляйте предметы, которыми хотите похвастаться перед гостями.", new Vector3(-3.0f, 0.9f, 0.3f), new Vector3(0.8f, 0.9f, 0.6f), wood, RoomObjectRole.TrophyStand, true);
CreateBlock("Ceiling beam", new Vector3(0, 2.93f, 0.5f), new Vector3(7.5f, 0.12f, 0.16f), wood);
        }

        private void BuildPlayer()
        {
            var player = new GameObject("Player");
            player.transform.position = new Vector3(0.5f, 0, -1.5f);
            var cameraObject = new GameObject("First Person Camera");
            cameraObject.transform.SetParent(player.transform, false);
            cameraObject.transform.localPosition = new Vector3(0, 1.65f, 0);
            var camera = cameraObject.AddComponent<Camera>();
            camera.fieldOfView = 68;
            camera.nearClipPlane = 0.08f;
            camera.farClipPlane = 24;
            camera.backgroundColor = new Color(0.025f, 0.018f, 0.015f);
            cameraObject.AddComponent<AudioListener>();
            player.AddComponent<GridFirstPersonController>();
        }

        private void BuildLighting()
        {
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.09f, 0.075f, 0.06f);
            var lightObject = new GameObject("Warm room light");
            lightObject.transform.position = new Vector3(0, 2.65f, 0.5f);
            var light = lightObject.AddComponent<Light>();
            light.type = LightType.Point;
            light.color = new Color(1f, 0.64f, 0.34f);
            light.intensity = 1.8f;
            light.range = 6.5f;
            light.shadows = LightShadows.None;
        }

        private void BuildUI()
        {
            var ui = new GameObject("LORGUS Room UI");
            var canvas = ui.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            ui.AddComponent<CanvasScaler>();
            ui.AddComponent<GraphicRaycaster>();

            var overlayObject = new GameObject("Eyes opening overlay");
            overlayObject.transform.SetParent(canvas.transform, false);
            var overlay = overlayObject.AddComponent<Image>();
            overlay.color = Color.black;
            overlay.raycastTarget = false;
            var overlayRect = overlay.rectTransform;
            overlayRect.anchorMin = Vector2.zero;
            overlayRect.anchorMax = Vector2.one;
            overlayRect.offsetMin = Vector2.zero;
            overlayRect.offsetMax = Vector2.zero;
            var wakeSequence = ui.AddComponent<WakeUpSequence>();
            wakeSequence.SetOverlay(overlay);

            var hint = MakeText("Controls hint", canvas.transform, 16, new Vector2(0, 24), new Vector2(900, 44));
            hint.alignment = TextAnchor.LowerCenter;
            hint.text = "W / S — шаг     A / D — поворот     E — взаимодействие     F — взять / поставить     C — настройка     Esc — курсор";

            var interaction = ui.AddComponent<RoomInteractionUI>();
            interaction.Build(canvas.transform);
        }

        private static Text MakeText(string name, Transform parent, int size, Vector2 position, Vector2 dimensions)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var text = go.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = size;
            text.color = new Color(0.78f, 0.70f, 0.58f);
            text.alignment = TextAnchor.MiddleCenter;
            var rect = text.rectTransform;
            rect.anchorMin = new Vector2(0.5f, 0);
            rect.anchorMax = new Vector2(0.5f, 0);
            rect.pivot = new Vector2(0.5f, 0);
            rect.anchoredPosition = position;
            rect.sizeDelta = dimensions;
            return text;
        }

        private static void AddInteractable(string objectName, string title, string description, Vector3 position, Vector3 scale, Material material, RoomObjectRole role = RoomObjectRole.Inspect, bool movable = false)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = objectName;
            go.transform.position = position;
            go.transform.localScale = scale;
            go.GetComponent<Renderer>().sharedMaterial = material;
            var target = go.AddComponent<RoomInteractable>();
            target.Configure(title, description);
        }

        private static void CreateBlock(string name, Vector3 position, Vector3 scale, Material material)
        {
            var block = GameObject.CreatePrimitive(PrimitiveType.Cube);
            block.name = name;
            block.transform.position = position;
            block.transform.localScale = scale;
            block.GetComponent<Renderer>().sharedMaterial = material;
        }
    }
}
