using System;
using System.IO;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.UI;
using System.Collections;

namespace Lorgus.Prototype
{
    /// <summary>
    /// Player-owned picture frames and replaceable music. Files are read from persistentDataPath/LORGUS.
    /// No network calls and no third-party file picker required.
    /// </summary>
    public sealed class RoomCustomization : MonoBehaviour
    {
        private string root;
        private string framesPath;
        private string musicPath;
        private Renderer pictureRenderer;
        private Texture2D pictureTexture;
        private Vector2 imageOffset = new Vector2(0.5f, 0.5f);
        private float imageZoom = 1f;
        private AudioSource musicSource;
        private Text statusText;
        private GameObject panel;
        private bool editing;
        private bool dragging;
        private Vector3 dragStart;
        private Vector2 offsetStart;

        public string FramesPath => framesPath;
        public string MusicPath => musicPath;

        public void Initialize(Renderer frameRenderer)
        {
            root = Path.Combine(Application.persistentDataPath, "LORGUS");
            framesPath = Path.Combine(root, "Frames");
            musicPath = Path.Combine(root, "Music");
            Directory.CreateDirectory(framesPath);
            Directory.CreateDirectory(musicPath);
            pictureRenderer = frameRenderer;
            musicSource = gameObject.AddComponent<AudioSource>();
            musicSource.loop = true;
            musicSource.volume = 0.22f;
            musicSource.spatialBlend = 0f;
            BuildPanel();
            LoadFrameImage();
            StartCoroutine(LoadMusic());
        }

        private void Update()
        {
            if (Input.GetKeyDown(KeyCode.C)) TogglePanel();
            if (pictureRenderer == null || pictureTexture == null) return;
            if (editing && Input.GetMouseButtonDown(0))
            {
                Ray ray = Camera.main != null ? Camera.main.ScreenPointToRay(Input.mousePosition) : default;
                if (Physics.Raycast(ray, out RaycastHit hit, 4f) && hit.collider.gameObject == pictureRenderer.gameObject)
                {
                    dragging = true;
                    dragStart = Input.mousePosition;
                    offsetStart = imageOffset;
                }
            }
            if (Input.GetMouseButtonUp(0)) dragging = false;
            if (dragging)
            {
                Vector3 delta = Input.mousePosition - dragStart;
                imageOffset = new Vector2(
                    Mathf.Clamp01(offsetStart.x + delta.x / Mathf.Max(1f, Screen.width) * 2f),
                    Mathf.Clamp01(offsetStart.y + delta.y / Mathf.Max(1f, Screen.height) * 2f));
                ApplyTextureTransform();
            }
            if (editing && pictureRenderer != null && Mathf.Abs(Input.mouseScrollDelta.y) > 0.01f)
            {
                imageZoom = Mathf.Clamp(imageZoom - Input.mouseScrollDelta.y * 0.05f, 0.5f, 2.5f);
                ApplyTextureTransform();
            }
        }

        private void BuildPanel()
        {
            var canvasObject = new GameObject("LORGUS customization canvas");
            canvasObject.transform.SetParent(transform, false);
            var canvas = canvasObject.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 30;
            canvasObject.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            canvasObject.AddComponent<GraphicRaycaster>();
            panel = new GameObject("Customization help panel");
            panel.transform.SetParent(canvasObject.transform, false);
            var rect = panel.AddComponent<RectTransform>();
            rect.anchorMin = new Vector2(0.5f, 0.5f);
            rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.sizeDelta = new Vector2(660, 240);
            var bg = panel.AddComponent<Image>();
            bg.color = new Color(0.035f, 0.025f, 0.018f, 0.96f);
            var label = new GameObject("Instructions").AddComponent<Text>();
            label.transform.SetParent(panel.transform, false);
            label.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            label.fontSize = 17;
            label.alignment = TextAnchor.MiddleCenter;
            label.color = new Color(0.9f, 0.83f, 0.69f);
            label.horizontalOverflow = HorizontalWrapMode.Wrap;
            label.verticalOverflow = VerticalWrapMode.Overflow;
            label.rectTransform.sizeDelta = new Vector2(610, 210);
            label.text = "КАСТОМИЗАЦИЯ LORGUS\n\nРамки: папка Frames в каталоге сохранений игры. Положите туда PNG/JPG с именем frame.png и перезапустите игру.\n\nМузыка: папка Music. Файлы: room.ogg, room.wav или room.mp3.\n\nВ режиме настройки наведитесь на рамку: зажмите ЛКМ и двигайте изображение; колесо мыши меняет масштаб.\n\nC — закрыть это окно";
            panel.SetActive(false);
            statusText = label;
        }

        private void TogglePanel()
        {
            editing = !editing;
            if (panel != null) panel.SetActive(editing);
            Cursor.visible = editing;
            Cursor.lockState = editing ? CursorLockMode.None : CursorLockMode.Locked;
        }

        private void LoadFrameImage()
        {
            string[] candidates = { Path.Combine(framesPath, "frame.png"), Path.Combine(framesPath, "frame.jpg"), Path.Combine(framesPath, "frame.jpeg") };
            foreach (string path in candidates)
            {
                if (!File.Exists(path)) continue;
                var texture = new Texture2D(2, 2, TextureFormat.RGBA32, false);
                if (!texture.LoadImage(File.ReadAllBytes(path))) { Destroy(texture); continue; }
                texture.wrapMode = TextureWrapMode.Clamp;
                pictureTexture = texture;
                pictureRenderer.material.mainTexture = texture;
                ApplyTextureTransform();
                return;
            }
        }

        private void ApplyTextureTransform()
        {
            if (pictureRenderer == null || pictureTexture == null) return;
            pictureRenderer.material.mainTextureScale = new Vector2(imageZoom, imageZoom);
            pictureRenderer.material.mainTextureOffset = new Vector2(
                Mathf.Clamp01(imageOffset.x) * (1f - imageZoom),
                Mathf.Clamp01(imageOffset.y) * (1f - imageZoom));
        }

        private IEnumerator LoadMusic()
        {
            string[] names = { "room.ogg", "room.wav", "room.mp3" };
            foreach (string name in names)
            {
                string path = Path.Combine(musicPath, name);
                if (!File.Exists(path)) continue;
                using (UnityWebRequest request = UnityWebRequestMultimedia.GetAudioClip(new Uri(path).AbsoluteUri, AudioType.UNKNOWN))
                {
                    yield return request.SendWebRequest();
                    if (request.result != UnityWebRequest.Result.Success) continue;
                    musicSource.clip = DownloadHandlerAudioClip.GetContent(request);
                    musicSource.Play();
                    yield break;
                }
            }
            musicSource.clip = BuildDefaultMusic();
            musicSource.volume = 0.12f;
            musicSource.Play();
        }

        // A quiet, original procedural fantasy-room music bed used until the player supplies room.ogg/wav/mp3.
        private static AudioClip BuildDefaultMusic()
        {
            const int rate = 22050;
            const int seconds = 24;
            int count = rate * seconds;
            var samples = new float[count * 2];
            float[] notes = { 110f, 146.83f, 164.81f, 220f, 164.81f, 146.83f, 123.47f, 164.81f };
            for (int i = 0; i < count; i++)
            {
                float t = (float)i / rate;
                int beat = Mathf.FloorToInt(t / 3f);
                float local = t % 3f;
                float fadeIn = Mathf.Clamp01(t / 1.8f);
                float fadeOut = Mathf.Clamp01((seconds - t) / 1.8f);
                float envelope = Mathf.Min(fadeIn, fadeOut);
                float root = notes[beat % notes.Length];
                float drone = Mathf.Sin(2f * Mathf.PI * root * t) * 0.022f
                    + Mathf.Sin(2f * Mathf.PI * root * 1.5f * t) * 0.009f
                    + Mathf.Sin(2f * Mathf.PI * root * 2f * t) * 0.004f;
                float pluckEnvelope = Mathf.Exp(-local * 2.7f);
                float pluck = Mathf.Sin(2f * Mathf.PI * root * 4f * local) * pluckEnvelope * 0.035f;
                float note = (drone + pluck) * envelope;
                samples[i * 2] = note;
                samples[i * 2 + 1] = note * 0.97f;
            }
            var clip = AudioClip.Create("LORGUS - room music fallback", count, 2, rate, false);
            clip.SetData(samples, 0);
            return clip;
        }

        private void OnDestroy()
        {
            if (pictureTexture != null) Destroy(pictureTexture);
        }
    }
}