using UnityEngine;
using UnityEngine.UI;

namespace Lorgus.Prototype
{
    public sealed class RoomInteractionUI : MonoBehaviour
    {
        private Text titleText;
        private Text bodyText;
        private GameObject panel;
        private float hideAt;

        public void Build(Transform parent)
        {
            panel = new GameObject("Room interaction panel");
            panel.transform.SetParent(parent, false);
            var rect = panel.AddComponent<RectTransform>();
            rect.anchorMin = new Vector2(0.5f, 0.5f);
            rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = new Vector2(0, -90);
            rect.sizeDelta = new Vector2(680, 210);
            var background = panel.AddComponent<Image>();
            background.color = new Color(0.035f, 0.027f, 0.02f, 0.94f);
            background.raycastTarget = false;
            titleText = MakeText("Title", panel.transform, 21, FontStyle.Bold, new Vector2(0, 70), new Vector2(620, 36));
            bodyText = MakeText("Description", panel.transform, 16, FontStyle.Normal, new Vector2(0, -5), new Vector2(620, 115));
            titleText.alignment = TextAnchor.MiddleCenter;
            bodyText.alignment = TextAnchor.MiddleCenter;
            panel.SetActive(false);
        }

        public void Show(RoomInteractable target)
        {
            if (target == null) return;
            string action;
            switch (target.Role)
            {
                case RoomObjectRole.RpMessages: action = "Здесь открываются RP-сообщения и игровая переписка."; break;
                case RoomObjectRole.Inventory: action = "Здесь открывается инвентарь персонажа."; break;
                case RoomObjectRole.Lorebook: action = "Здесь открывается Лорбук."; break;
                case RoomObjectRole.WorldMap: action = "Здесь выбирают доступное место для перемещения."; break;
                case RoomObjectRole.CharacterMirror: action = "Здесь будут карточка персонажа и его статистика."; break;
                default: action = target.Description; break;
            }
            ShowText(target.DisplayName, action + "\n\n[E] — взаимодействовать");
        }

        public void ShowText(string title, string body)
        {
            if (titleText == null || bodyText == null || panel == null) return;
            titleText.text = title;
            bodyText.text = body;
            panel.SetActive(true);
            hideAt = Time.unscaledTime + 12f;
        }

        private void Update()
        {
            if (panel != null && panel.activeSelf && Time.unscaledTime >= hideAt) panel.SetActive(false);
        }

        private static Text MakeText(string name, Transform parent, int size, FontStyle style, Vector2 position, Vector2 dimensions)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var text = go.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = size;
            text.fontStyle = style;
            text.color = new Color(0.88f, 0.82f, 0.7f);
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            var rect = text.rectTransform;
            rect.anchorMin = new Vector2(0.5f, 0.5f);
            rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = position;
            rect.sizeDelta = dimensions;
            return text;
        }
    }
}