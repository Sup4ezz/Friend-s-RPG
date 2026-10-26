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

        private bool roomBuilt;
        public string ActiveCharacterId { get; private set; }
        public string ActiveCharacterName { get; private set; }
        public string AccessToken { get; private set; }

        private void Awake()
        {
            Application.targetFrameRate = 60;
            QualitySettings.vSyncCount = 1;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
            var login = gameObject.AddComponent<CosmicLoginController>();
            login.Initialize(this);
        }

        public void EnterRoomAfterApproval(string characterId, string characterName, string accessToken)
        {
            if (roomBuilt) return;
            ActiveCharacterId = characterId;
            ActiveCharacterName = characterName;
            AccessToken = accessToken;
            roomBuilt = true;
            BuildRoom();
            var windowView = gameObject.AddComponent<WindowViewController>();
            windowView.Initialize(ActiveCharacterId, AccessToken);
            BuildPlayer();
            BuildLighting();
            gameObject.AddComponent<RoomAtmosphere>();
            BuildUI();
        }

        private static Material MakeMaterial(Color color)
        {
            // Shader.Find can return null in a player build when the shader was stripped.
            // Clone Unity's built-in default material first; its shader is included by the engine.
            Material builtIn = Resources.GetBuiltinResource<Material>("Default-Material.mat");
            if (builtIn != null)
            {
                Material material = new Material(builtIn);
                material.color = color;
                return material;
            }

            string[] shaderNames =
            {
                "Universal Render Pipeline/Lit",
                "Standard",
                "Unlit/Color",
                "Sprites/Default",
                "Hidden/Internal-Colored"
            };

            foreach (string shaderName in shaderNames)
            {
                Shader shader = Shader.Find(shaderName);
                if (shader == null) continue;
                Material material = new Material(shader);
                material.color = color;
                return material;
            }

            throw new System.InvalidOperationException(
                "LORGUS could not create a room material: no usable built-in shader was available.");
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
            AddInteractable("Door leaf", "Дверь на улицу", "Дверь закрыта. Её назначение — выход из комнаты; полноценный переход в мир будет подключён после реализации локаций.", new Vector3(0, 1.15f, -3.91f), new Vector3(1.7f, 2.3f, 0.08f), wood);
            CreateBlock("Door crossbar", new Vector3(0, 1.25f, -3.84f), new Vector3(1.3f, 0.08f, 0.035f), brass);
            CreateBlock("Door handle", new Vector3(0.55f, 1.15f, -3.79f), new Vector3(0.07f, 0.07f, 0.07f), brass);

            // The asset catalogue is generated from the FBX files already committed to this branch.
            // If Unity has not generated it yet, the primitive fallback keeps the prototype playable.
            CreateBlock("Bed frame", new Vector3(-1.65f, 0.28f, 1.1f), new Vector3(2.25f, 0.38f, 1.55f), wood);
            if (!HasModel("Bed frame"))
            {
                CreateBlock("Bed mattress", new Vector3(-1.65f, 0.52f, 1.1f), new Vector3(2.12f, 0.18f, 1.43f), linen);
                CreateBlock("Rumpled blanket", new Vector3(-1.65f, 0.64f, 1.42f), new Vector3(2.08f, 0.08f, 0.72f), cloth);
                CreateBlock("Pillow", new Vector3(-1.65f, 0.65f, 0.63f), new Vector3(0.7f, 0.12f, 0.35f), linen);
            }
            AddInteractable("Bed inspection", "Постель", "Простыни сбились в складки. Похоже, вы провели здесь немало времени — или проснулись резко.", new Vector3(-1.65f, 0.74f, 1.1f), new Vector3(2.1f, 0.16f, 1.4f), linen, visible: false);

            // Rug, bedside table and candle.
            CreateBlock("Woven rug", new Vector3(0.15f, 0.015f, 0.35f), new Vector3(2.15f, 0.025f, 2.7f), cloth);
            CreateBlock("Rug central pattern", new Vector3(0.15f, 0.032f, 0.35f), new Vector3(0.12f, 0.01f, 2.35f), brass);
            CreateBlock("Bedside table", new Vector3(0.05f, 0.42f, 1.55f), new Vector3(0.58f, 0.78f, 0.58f), wood);
            if (!HasModel("Bedside table"))
                CreateBlock("Table drawer", new Vector3(0.05f, 0.48f, 1.245f), new Vector3(0.42f, 0.18f, 0.035f), brass);
            CreateBlock("Candle", new Vector3(0.05f, 0.88f, 1.55f), new Vector3(0.08f, 0.18f, 0.08f), linen);
            if (!HasModel("Candle"))
                CreateBlock("Candle flame", new Vector3(0.05f, 1.005f, 1.55f), new Vector3(0.035f, 0.07f, 0.035f), brass);
            AddInteractable("Table inspection", "Письменный стол", "Здесь персонаж сможет читать и писать RP-сообщения.", new Vector3(-2.8f, 0.95f, -2.6f), new Vector3(1.65f, 0.12f, 0.8f), wood, RoomObjectRole.RpMessages, true, false);

            // Chest is the inventory entry point; no separate wardrobe is part of the confirmed room.
            CreateBlock("Storage chest", new Vector3(2.95f, 0.38f, -0.2f), new Vector3(1.15f, 0.72f, 0.75f), wood);
            if (!HasModel("Storage chest"))
                CreateBlock("Chest lid", new Vector3(2.95f, 0.77f, -0.2f), new Vector3(1.18f, 0.1f, 0.78f), brass);
            AddInteractable("Chest inspection", "Сундук — инвентарь", "Здесь должен открываться инвентарь персонажа.", new Vector3(2.95f, 0.42f, -0.2f), new Vector3(1.15f, 0.8f, 0.75f), wood, RoomObjectRole.Inventory, false, false);

            // Writing desk, book and the dark window.
            CreateBlock("Writing desk top", new Vector3(-2.8f, 0.95f, -2.6f), new Vector3(1.65f, 0.12f, 0.8f), wood);
            if (!HasModel("Writing desk top"))
            {
                CreateBlock("Desk left leg", new Vector3(-3.45f, 0.45f, -2.6f), new Vector3(0.12f, 0.9f, 0.12f), wood);
                CreateBlock("Desk right leg", new Vector3(-2.15f, 0.45f, -2.6f), new Vector3(0.12f, 0.9f, 0.12f), wood);
            }
            // The hearth, cauldron and window are required parts of this one room.
            CreateBlock("Hearth stone base", new Vector3(2.55f, 0.34f, 3.05f), new Vector3(1.35f, 0.68f, 1.05f), stone);
            CreateBlock("Hearth opening", new Vector3(2.55f, 0.45f, 2.49f), new Vector3(0.68f, 0.42f, 0.06f), wood);
            CreateBlock("Hearth top", new Vector3(2.55f, 0.72f, 3.05f), new Vector3(1.45f, 0.12f, 1.12f), brass);
            CreateBlock("Cauldron bowl", new Vector3(2.55f, 1.03f, 3.05f), new Vector3(0.62f, 0.38f, 0.62f), stone);
            CreateBlock("Cauldron rim", new Vector3(2.55f, 1.23f, 3.05f), new Vector3(0.7f, 0.08f, 0.7f), brass);
            CreateBlock("Cauldron support", new Vector3(2.55f, 1.48f, 3.05f), new Vector3(0.045f, 0.52f, 0.045f), brass);

            CreateBlock("Window frame", new Vector3(0, 1.95f, 3.84f), new Vector3(1.7f, 1.35f, 0.12f), wood);
            AddInteractable("Window inspection", "Окно", "За стеклом пока нет подключённого вида региона. Контекстный вид будет загружаться по текущему RP-местоположению персонажа.", new Vector3(0, 1.95f, 3.76f), new Vector3(1.45f, 1.1f, 0.04f), stone);
            CreateBlock("Window vertical bar", new Vector3(0, 1.95f, 3.71f), new Vector3(0.06f, 1.12f, 0.04f), brass);
            CreateBlock("Window horizontal bar", new Vector3(0, 1.95f, 3.71f), new Vector3(1.48f, 0.06f, 0.04f), brass);

            AddInteractable("Empty mirror", "Зеркало без отражения", "Зеркало не отражает ваше лицо. Здесь будут карточка персонажа и статистика.", new Vector3(1.65f, 1.95f, 3.78f), new Vector3(0.75f, 1.25f, 0.06f), brass, RoomObjectRole.CharacterMirror, false);
            CreateBlock("Ceiling beam", new Vector3(0, 2.93f, 0.5f), new Vector3(7.5f, 0.12f, 0.16f), wood);
        }

        private void BuildPlayer()
        {
            var player = new GameObject("Player");
            player.transform.position = new Vector3(-1.65f, 0.72f, 1.1f);
            var character = player.AddComponent<CharacterController>();
            character.height = 1.8f;
            character.radius = 0.25f;
            character.center = new Vector3(0f, 0.9f, 0f);
            character.stepOffset = 0.25f;
            character.slopeLimit = 45f;
            var cameraObject = new GameObject("First Person Camera");
            cameraObject.transform.SetParent(player.transform, false);
            cameraObject.transform.localPosition = new Vector3(0, 0.38f, 0);
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
            light.range = 8.5f;
            light.shadows = LightShadows.Soft;
            light.shadowStrength = 0.62f;
            light.shadowBias = 0.06f;
            light.shadowNormalBias = 0.35f;

            var candleObject = new GameObject("Candle glow");
            candleObject.transform.position = new Vector3(0.05f, 1.0f, 1.55f);
            var candleLight = candleObject.AddComponent<Light>();
            candleLight.type = LightType.Point;
            candleLight.color = new Color(1f, 0.48f, 0.19f);
            candleLight.intensity = 0.48f;
            candleLight.range = 2.7f;
            candleLight.shadows = LightShadows.None;
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
            hint.text = "WASD — движение     Мышь — обзор     E — взаимодействие     Esc — курсор";

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

        private static void AddInteractable(string objectName, string title, string description, Vector3 position, Vector3 scale, Material material, RoomObjectRole role = RoomObjectRole.Inspect, bool movable = false, bool visible = true)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = objectName;
            go.transform.position = position;
            go.transform.localScale = scale;
            var renderer = go.GetComponent<Renderer>();
            renderer.sharedMaterial = material;
            renderer.enabled = visible;
            var target = go.AddComponent<RoomInteractable>();
            target.Configure(title, description, role, movable);
        }

        private static LorgusRoomAssetCatalog _assetCatalog;

        private static LorgusRoomAssetCatalog AssetCatalog
        {
            get
            {
                if (_assetCatalog == null)
                    _assetCatalog = Resources.Load<LorgusRoomAssetCatalog>("LorgusRoomAssetCatalog");
                return _assetCatalog;
            }
        }

        private static bool HasModel(string objectName) => ResolveModel(objectName) != null;

        private static GameObject ResolveModel(string objectName)
        {
            var assets = AssetCatalog;
            if (assets == null) return null;
            switch (objectName)
            {
                case "Bed frame": return assets.bed;
                case "Bedside table": return assets.nightstand;
                case "Candle": return assets.candle;
                case "Wardrobe body": return assets.cabinet;
                case "Storage chest": return assets.chest;
                case "Writing desk top": return assets.desk;
                case "Wall shelf": return assets.shelf;
                case "Shelf book 0":
                case "Shelf book 1":
                case "Shelf book 2":
                case "Shelf book 3":
                case "Shelf book 4": return assets.book;
                default: return null;
            }
        }

        private static GameObject CreateBlock(string name, Vector3 position, Vector3 scale, Material material)
        {
            GameObject model = ResolveModel(name);
            if (model != null)
            {
                var instance = Instantiate(model);
                instance.name = name;
                instance.transform.position = position;
                instance.transform.rotation = Quaternion.identity;

                // Fit props to the old block footprint while preserving their imported materials.
                var renderers = instance.GetComponentsInChildren<Renderer>(true);
                if (renderers.Length > 0)
                {
                    Bounds bounds = renderers[0].bounds;
                    for (int i = 1; i < renderers.Length; i++) bounds.Encapsulate(renderers[i].bounds);
                    Vector3 sourceSize = bounds.size;
                    if (sourceSize.x > 0.001f && sourceSize.y > 0.001f && sourceSize.z > 0.001f)
                    {
                        // Preserve the FBX proportions; fit its footprint rather than flattening a
                        // complete bed/table/cabinet into the dimensions of the old cube placeholder.
                        float fit = Mathf.Min(scale.x / sourceSize.x, scale.z / sourceSize.z);
                        instance.transform.localScale = Vector3.one * fit;
                        // Most props sit on the old placeholder's base. The desk placeholder represented
                        // only its tabletop, while the imported FBX represents the complete table.
                        float bottom = name == "Writing desk top" ? 0f : position.y - scale.y * 0.5f;
                        var scaledRenderers = instance.GetComponentsInChildren<Renderer>(true);
                        Bounds scaledBounds = scaledRenderers[0].bounds;
                        for (int i = 1; i < scaledRenderers.Length; i++) scaledBounds.Encapsulate(scaledRenderers[i].bounds);
                        instance.transform.position += Vector3.up * (bottom - scaledBounds.min.y);
                        scaledBounds.center += Vector3.up * (bottom - scaledBounds.min.y);

                        // Give the imported prop a collider that follows its real mesh bounds.
                        var box = instance.GetComponent<BoxCollider>();
                        if (box == null) box = instance.AddComponent<BoxCollider>();
                        box.center = instance.transform.InverseTransformPoint(scaledBounds.center);
                        box.size = scaledBounds.size / fit;
                    }
                }

                return instance;
            }

            var block = GameObject.CreatePrimitive(PrimitiveType.Cube);
            block.name = name;
            block.transform.position = position;
            block.transform.localScale = scale;
            block.GetComponent<Renderer>().sharedMaterial = material;
            return block;
        }
    }
}
