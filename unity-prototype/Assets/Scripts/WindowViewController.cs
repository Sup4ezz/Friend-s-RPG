using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace Lorgus.Prototype
{
    /// <summary>
    /// Builds a stylized exterior view from the selected character's real RP presence.
    /// Read-only Supabase access; a missing/error presence produces an unknown mist view.
    /// </summary>
    public sealed class WindowViewController : MonoBehaviour
    {
        private const string SupabaseUrl = "https://dxdxnttpznoekaiecrlv.supabase.co";
        private const string PublishableKey = "sb_publishable_LlRg71tECimoRn2zuzxqlQ_OeCupPLe";

        [Serializable] private sealed class PresenceRow
        {
            public string presence_type;
            public string region;
            public string location;
            public string from_region;
            public string from_location;
            public string to_region;
            public string to_location;
        }
        [Serializable] private sealed class PresenceRows { public PresenceRow[] items; }

        private string characterId;
        private string accessToken;
        private CosmicLoginController sessionOwner;
        private float lastTokenRefreshAt;
        private string lastViewKey;
        private GameObject viewRoot;

        public void Initialize(string selectedCharacterId, string bearerToken, CosmicLoginController owner)
        {
            characterId = selectedCharacterId;
            accessToken = bearerToken;
            sessionOwner = owner;
        }

        private IEnumerator Start()
        {
            lastTokenRefreshAt = Time.realtimeSinceStartup;
            BuildView("", "", "unknown");
            while (true)
            {
                yield return RefreshPresence();
                // Supabase access tokens are short-lived. Refresh before expiry so the
                // location window keeps following RP presence during long sessions.
                if (sessionOwner != null && Time.realtimeSinceStartup - lastTokenRefreshAt >= 45f * 60f)
                {
                    bool refreshed = false;
                    yield return sessionOwner.RefreshActiveSession(ok => refreshed = ok);
                    if (refreshed) accessToken = sessionOwner.CurrentAccessToken;
                    lastTokenRefreshAt = Time.realtimeSinceStartup;
                }
                yield return new WaitForSecondsRealtime(30f);
            }
        }

        private IEnumerator RefreshPresence()
        {
            if (string.IsNullOrEmpty(characterId) || string.IsNullOrEmpty(accessToken))
            {
                ApplyPresence(null);
                yield break;
            }

            string url = SupabaseUrl + "/rest/v1/rp_presence?select=presence_type,region,location,from_region,from_location,to_region,to_location&character_id=eq."
                + UnityWebRequest.EscapeURL(characterId);
            using (var request = UnityWebRequest.Get(url))
            {
                request.SetRequestHeader("apikey", PublishableKey);
                request.SetRequestHeader("Authorization", "Bearer " + accessToken);
                request.SetRequestHeader("Accept", "application/json");
                request.timeout = 15;
                yield return request.SendWebRequest();
                if (request.result != UnityWebRequest.Result.Success)
                {
                    // Do not invent a location if the signed-in player cannot read presence.
                    ApplyPresence(null);
                    yield break;
                }

                PresenceRows rows;
                try { rows = JsonUtility.FromJson<PresenceRows>("{\"items\":" + request.downloadHandler.text + "}"); }
                catch { rows = null; }
                ApplyPresence(rows != null && rows.items != null && rows.items.Length > 0 ? rows.items[0] : null);
            }
        }

        private void ApplyPresence(PresenceRow presence)
        {
            string presenceType = presence != null ? presence.presence_type : "";
            string region = "";
            string location = "";
            if (presence != null && presenceType == "road")
            {
                region = !string.IsNullOrEmpty(presence.to_region) ? presence.to_region : presence.from_region;
                location = "В пути: " + (presence.from_location ?? "?") + " → " + (presence.to_location ?? "?");
            }
            else if (presence != null)
            {
                region = presence.region ?? "";
                location = presence.location ?? "";
            }

            string key = presenceType + "|" + region + "|" + location;
            if (key == lastViewKey) return;
            lastViewKey = key;
            BuildView(region, location, presenceType);
        }

        private void BuildView(string region, string location, string presenceType)
        {
            if (viewRoot != null) Destroy(viewRoot);
            viewRoot = new GameObject("Window exterior — " + (string.IsNullOrEmpty(region) ? "неизвестно" : region));
            viewRoot.transform.SetParent(transform, false);

            Color sky;
            Color land;
            string theme = ResolveTheme(region, out sky, out land);
            Shape(PrimitiveType.Cube, "Distant sky", new Vector3(0f, 1.95f, 8.65f),
                new Vector3(7.8f, 4.6f, 0.12f), sky);

            // The horizon is deliberately kept below the center of the narrow window aperture.
            Shape(PrimitiveType.Cube, "Horizon", new Vector3(0f, 0.9f, 8.35f),
                new Vector3(7.8f, 1.35f, 0.3f), land);

            int seed = string.IsNullOrEmpty(location) ? 0 : Mathf.Abs(location.GetHashCode());
            float landmarkOffset = ((seed % 7) - 3) * 0.12f;

            switch (theme)
            {
                case "desert":
                    Shape(PrimitiveType.Sphere, "Sun", new Vector3(landmarkOffset, 2.35f, 8.05f), new Vector3(0.52f, 0.52f, 0.18f), new Color(1f, 0.68f, 0.32f));
                    Shape(PrimitiveType.Sphere, "Dune left", new Vector3(-1.25f, 1.15f, 7.95f), new Vector3(3.2f, 1.0f, 0.6f), new Color(0.65f, 0.31f, 0.12f));
                    Shape(PrimitiveType.Sphere, "Dune right", new Vector3(1.1f, 1.02f, 7.8f), new Vector3(3.1f, 0.8f, 0.55f), new Color(0.84f, 0.49f, 0.22f));
                    Shape(PrimitiveType.Cylinder, "Far basalt spire", new Vector3(landmarkOffset + 0.8f, 1.7f, 7.6f), new Vector3(0.18f, 0.9f, 0.18f), new Color(0.29f, 0.16f, 0.11f));
                    break;
                case "snow":
                    Shape(PrimitiveType.Sphere, "Ash mountain left", new Vector3(-1.4f, 1.65f, 7.9f), new Vector3(3.1f, 2.1f, 0.7f), new Color(0.36f, 0.38f, 0.4f));
                    Shape(PrimitiveType.Sphere, "Snow peak", new Vector3(landmarkOffset, 1.95f, 7.55f), new Vector3(2.3f, 2.45f, 0.55f), new Color(0.77f, 0.79f, 0.8f));
                    Shape(PrimitiveType.Sphere, "Snow ridge right", new Vector3(1.7f, 1.45f, 7.85f), new Vector3(2.6f, 1.7f, 0.6f), new Color(0.58f, 0.61f, 0.64f));
                    Shape(PrimitiveType.Cube, "Ash at horizon", new Vector3(0f, 1.05f, 7.45f), new Vector3(7.6f, 0.25f, 0.3f), new Color(0.23f, 0.22f, 0.23f));
                    break;
                case "industrial":
                    for (int i = 0; i < 6; i++)
                    {
                        float x = -2.3f + i * 0.9f;
                        float h = 0.8f + ((i + seed) % 3) * 0.28f;
                        Shape(PrimitiveType.Cube, "Brick silhouette " + i, new Vector3(x, 1.1f + h * 0.5f, 7.9f),
                            new Vector3(0.78f, h, 0.28f), new Color(0.08f, 0.075f, 0.085f));
                    }
                    Shape(PrimitiveType.Cube, "Old tower", new Vector3(landmarkOffset, 1.8f, 7.45f), new Vector3(0.48f, 2.1f, 0.4f), new Color(0.12f, 0.09f, 0.085f));
                    for (int i = 0; i < 3; i++)
                        Shape(PrimitiveType.Cube, "Distant lit window " + i, new Vector3(landmarkOffset - 0.12f + i * 0.12f, 1.55f + i * 0.24f, 7.18f),
                            new Vector3(0.055f, 0.09f, 0.035f), new Color(0.95f, 0.34f, 0.1f));
                    break;
                case "summer":
                    Shape(PrimitiveType.Sphere, "Summer sun", new Vector3(landmarkOffset, 2.45f, 8.05f), new Vector3(0.48f, 0.48f, 0.18f), new Color(1f, 0.88f, 0.58f));
                    Shape(PrimitiveType.Sphere, "Green hill left", new Vector3(-1.6f, 1.1f, 7.95f), new Vector3(3.8f, 1.1f, 0.7f), new Color(0.18f, 0.38f, 0.18f));
                    Shape(PrimitiveType.Sphere, "Green hill right", new Vector3(1.5f, 1.0f, 7.8f), new Vector3(3.4f, 0.9f, 0.65f), new Color(0.27f, 0.48f, 0.2f));
                    break;
                case "forest":
                    Shape(PrimitiveType.Sphere, "Forest canopy", new Vector3(0f, 1.85f, 8.0f), new Vector3(7.2f, 2.5f, 0.6f), new Color(0.055f, 0.19f, 0.09f));
                    for (int i = 0; i < 7; i++)
                    {
                        float x = -2.7f + i * 0.9f;
                        Shape(PrimitiveType.Cylinder, "Forest trunk " + i, new Vector3(x, 1.3f, 7.4f), new Vector3(0.09f, 1.15f, 0.09f), new Color(0.16f, 0.095f, 0.055f));
                        Shape(PrimitiveType.Sphere, "Forest crown " + i, new Vector3(x + landmarkOffset * 0.25f, 1.85f + (i % 2) * 0.2f, 7.25f),
                            new Vector3(0.8f, 1.15f, 0.35f), new Color(0.055f + (i % 2) * 0.025f, 0.23f + (i % 3) * 0.035f, 0.08f));
                    }
                    break;
                case "holy":
                    Shape(PrimitiveType.Sphere, "Pale sun", new Vector3(landmarkOffset, 2.4f, 8.05f), new Vector3(0.44f, 0.44f, 0.16f), new Color(1f, 0.9f, 0.66f));
                    Shape(PrimitiveType.Cylinder, "White tower", new Vector3(landmarkOffset, 1.65f, 7.6f), new Vector3(0.32f, 1.3f, 0.32f), new Color(0.86f, 0.84f, 0.75f));
                    Shape(PrimitiveType.Sphere, "White dome", new Vector3(landmarkOffset, 2.28f, 7.6f), new Vector3(0.52f, 0.42f, 0.4f), new Color(0.96f, 0.93f, 0.84f));
                    Shape(PrimitiveType.Cube, "White city", new Vector3(-1.4f, 1.35f, 8f), new Vector3(1.4f, 0.9f, 0.3f), new Color(0.8f, 0.81f, 0.76f));
                    break;
                case "gehenna":
                    Shape(PrimitiveType.Sphere, "Black cliff left", new Vector3(-1.7f, 1.55f, 7.9f), new Vector3(3.5f, 2.3f, 0.6f), new Color(0.07f, 0.035f, 0.04f));
                    Shape(PrimitiveType.Sphere, "Black cliff right", new Vector3(1.7f, 1.55f, 7.8f), new Vector3(3.5f, 2.2f, 0.6f), new Color(0.1f, 0.035f, 0.03f));
                    Shape(PrimitiveType.Cube, "Sealed gate", new Vector3(landmarkOffset, 1.65f, 7.25f), new Vector3(1.15f, 1.8f, 0.15f), new Color(0.035f, 0.025f, 0.03f));
                    for (int i = -2; i <= 2; i++)
                        Shape(PrimitiveType.Cylinder, "Gate bar " + i, new Vector3(landmarkOffset + i * 0.2f, 1.65f, 7.1f), new Vector3(0.025f, 0.95f, 0.025f), new Color(0.25f, 0.11f, 0.09f));
                    break;
                default:
                    Shape(PrimitiveType.Sphere, "Distant hills", new Vector3(-1.5f, 1.2f, 7.95f), new Vector3(4f, 1.2f, 0.6f), new Color(0.13f, 0.23f, 0.2f));
                    Shape(PrimitiveType.Sphere, "Distant ridge", new Vector3(1.4f, 1.25f, 7.8f), new Vector3(3.8f, 1.25f, 0.55f), new Color(0.16f, 0.22f, 0.3f));
                    Shape(PrimitiveType.Sphere, "Distant moon", new Vector3(landmarkOffset, 2.4f, 8.05f), new Vector3(0.35f, 0.35f, 0.12f), new Color(0.68f, 0.72f, 0.82f));
                    break;
            }

            // A subtle foreground silhouette makes different RP locations read differently even
            // when several locations belong to the same kingdom.
            if (!string.IsNullOrEmpty(location) && presenceType != "road")
            {
                Color markerColor = theme == "industrial" || theme == "gehenna"
                    ? new Color(0.24f, 0.08f, 0.055f)
                    : theme == "snow" ? new Color(0.67f, 0.7f, 0.72f)
                    : theme == "desert" ? new Color(0.58f, 0.28f, 0.12f)
                    : new Color(0.18f, 0.25f, 0.2f);
                Shape(PrimitiveType.Cylinder, "Location landmark", new Vector3(landmarkOffset, 1.28f, 7.05f),
                    new Vector3(0.09f + (seed % 3) * 0.035f, 0.38f + (seed % 4) * 0.1f, 0.09f + (seed % 3) * 0.035f), markerColor);
            }
        }

        private string ResolveTheme(string region, out Color sky, out Color land)
        {
            if (region.Contains("Каэлор"))
            {
                sky = new Color(0.48f, 0.2f, 0.12f); land = new Color(0.42f, 0.19f, 0.1f); return "desert";
            }
            if (region.Contains("Морвейн"))
            {
                sky = new Color(0.25f, 0.27f, 0.3f); land = new Color(0.32f, 0.33f, 0.34f); return "snow";
            }
            if (region.Contains("Атэрон"))
            {
                sky = new Color(0.015f, 0.018f, 0.04f); land = new Color(0.055f, 0.05f, 0.065f); return "industrial";
            }
            if (region.Contains("Ксандр"))
            {
                sky = new Color(0.28f, 0.58f, 0.77f); land = new Color(0.15f, 0.34f, 0.14f); return "summer";
            }
            if (region.Contains("Лирэн"))
            {
                sky = new Color(0.1f, 0.27f, 0.2f); land = new Color(0.035f, 0.14f, 0.07f); return "forest";
            }
            if (region.Contains("Святые Земли"))
            {
                sky = new Color(0.78f, 0.77f, 0.7f); land = new Color(0.8f, 0.79f, 0.72f); return "holy";
            }
            if (region.Contains("Спорные Земли"))
            {
                sky = new Color(0.19f, 0.29f, 0.38f); land = new Color(0.25f, 0.32f, 0.38f); return "snow";
            }
            if (region.Contains("Геена"))
            {
                sky = new Color(0.15f, 0.025f, 0.04f); land = new Color(0.06f, 0.025f, 0.03f); return "gehenna";
            }
            sky = new Color(0.1f, 0.15f, 0.25f);
            land = new Color(0.1f, 0.16f, 0.17f);
            return "unknown";
        }

        private GameObject Shape(PrimitiveType type, string name, Vector3 position, Vector3 scale, Color color)
        {
            var shape = GameObject.CreatePrimitive(type);
            shape.name = name;
            shape.transform.SetParent(viewRoot.transform, false);
            shape.transform.position = position;
            shape.transform.localScale = scale;
            var collider = shape.GetComponent<Collider>();
            if (collider != null) Destroy(collider);
            var renderer = shape.GetComponent<Renderer>();
            Shader shader = Shader.Find("Unlit/Color");
            if (shader == null) shader = Shader.Find("Sprites/Default");
            if (shader != null)
            {
                var material = new Material(shader);
                material.color = color;
                renderer.material = material;
            }
            return shape;
        }
    }
}