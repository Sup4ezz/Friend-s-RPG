using UnityEngine;
using UnityEngine.UI;

namespace Lorgus.Prototype
{
    /// <summary>
    /// Temporary in-world interaction shell. It clearly labels backend screens as pending;
    /// this must not be mistaken for real character/mail/inventory data integration.
    /// </summary>
    public sealed class RoomInteractionUI : MonoBehaviour
    {
        private Text titleText;
        private Text bodyText;
        private GameObject panel;
        private CursorLockMode previousLockState;
        private bool isOpen;
        private bool isRpScreen;
        private RectTransform panelRect;
        private Image panelBackground;

        public bool IsOpen => isOpen;

        public void Build(Transform parent)
        {
            panel = new GameObject("LORGUS interaction overlay");
            panel.transform.SetParent(parent, false);
            var rect = panel.AddComponent<RectTransform>();
            panelRect = rect;
            rect.anchorMin = new Vector2(0.5f, 0.5f);
            rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = Vector2.zero;
            rect.sizeDelta = new Vector2(760, 360);
            var background = panel.AddComponent<Image>();
            panelBackground = background;
            background.color = new Color(0.035f, 0.027f, 0.02f, 0.97f);
            titleText = MakeText("Title", panel.transform, 27, FontStyle.Bold,
                new Vector2(0, 115), new Vector2(690, 52));
            bodyText = MakeText("Description", panel.transform, 18, FontStyle.Normal,
                new Vector2(0, 5), new Vector2(660, 160));
            titleText.alignment = TextAnchor.MiddleCenter;
            bodyText.alignment = TextAnchor.MiddleCenter;
            bodyText.horizontalOverflow = HorizontalWrapMode.Wrap;
            bodyText.verticalOverflow = VerticalWrapMode.Overflow;
            BuildCloseButton(panel.transform);
            panel.SetActive(false);
        }

        public void Show(RoomInteractable target)
        {
            if (target == null) return;
            string title = target.DisplayName;
            string body;
            switch (target.Role)
            {
                case RoomObjectRole.RpMessages:
                    OpenRpScreen();
                    return;
                case RoomObjectRole.Inventory:
                    title = target.DisplayName.Contains("Сундук") ? "ИНВЕНТАРЬ" : target.DisplayName;
                    body = "Здесь будет открываться настоящий инвентарь персонажа из LORGUS.\n\nИнтеграция данных ещё не подключена.";
                    break;
                case RoomObjectRole.CharacterMirror:
                    title = "ЗЕРКАЛО";
                    body = "Зеркало не отражает вашего лица. Здесь будет открываться карточка персонажа из LORGUS.\n\nИнтеграция данных ещё не подключена.";
                    break;
                default:
                    body = target.Description;
                    break;
            }
            Open(title, body + "\n\nНажмите Esc или кнопку «Закрыть», чтобы вернуться в комнату.");
        }

        public void ShowText(string title, string body)
        {
            Open(title, body + "\n\nНажмите Esc или кнопку «Закрыть», чтобы вернуться в комнату.");
        }

        private void Open(string title, string body)
        {
            if (titleText == null || bodyText == null || panel == null) return;
            if (!isOpen) previousLockState = Cursor.lockState;
            titleText.text = title;
            bodyText.text = body;
            isRpScreen = false;
            panelRect.anchorMin = panelRect.anchorMax = new Vector2(0.5f, 0.5f);
            panelRect.anchoredPosition = Vector2.zero;
            panelRect.sizeDelta = new Vector2(760, 360);
            panelBackground.color = new Color(0.035f, 0.027f, 0.02f, 0.97f);
            panel.SetActive(true);
            isOpen = true;
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }

        private void OpenRpScreen()
        {
            if (panel == null || titleText == null || bodyText == null) return;
            if (!isOpen) previousLockState = Cursor.lockState;
            isRpScreen = true;
            titleText.text = "РОЛЕВАЯ ИГРА";
            bodyText.text = "RP открывается отдельным экраном, не поверх комнаты.\n\nПодключение существующей ленты RP и отправки постов ещё предстоит реализовать.\n\nЭто временная экранная заглушка; сообщения не загружаются и не отправляются.";
            panelRect.anchorMin = Vector2.zero;
            panelRect.anchorMax = Vector2.one;
            panelRect.offsetMin = Vector2.zero;
            panelRect.offsetMax = Vector2.zero;
            panelBackground.color = new Color(0.018f, 0.016f, 0.014f, 1f);
            panel.SetActive(true);
            isOpen = true;
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }

        public void Close()
        {
            if (!isOpen) return;
            isOpen = false;
            if (panel != null) panel.SetActive(false);
            if (isRpScreen && panelRect != null)
            {
                panelRect.anchorMin = panelRect.anchorMax = new Vector2(0.5f, 0.5f);
                panelRect.anchoredPosition = Vector2.zero;
                panelRect.sizeDelta = new Vector2(760, 360);
                panelRect.offsetMin = Vector2.zero;
                panelRect.offsetMax = Vector2.zero;
            }
            isRpScreen = false;
            Cursor.lockState = previousLockState;
            Cursor.visible = previousLockState != CursorLockMode.Locked;
        }

        private void Update()
        {
            if (isOpen && Input.GetKeyDown(KeyCode.Escape)) Close();
        }

        private void BuildCloseButton(Transform parent)
        {
            var buttonObject = new GameObject("Close interaction overlay");
            buttonObject.transform.SetParent(parent, false);
            var rect = buttonObject.AddComponent<RectTransform>();
            rect.anchorMin = new Vector2(0.5f, 0.5f);
            rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = new Vector2(0, -130);
            rect.sizeDelta = new Vector2(180, 44);
            var image = buttonObject.AddComponent<Image>();
            image.color = new Color(0.34f, 0.23f, 0.11f, 1f);
            var button = buttonObject.AddComponent<Button>();
            button.targetGraphic = image;
            button.onClick.AddListener(Close);
            var label = MakeText("Close label", buttonObject.transform, 17, FontStyle.Bold,
                Vector2.zero, new Vector2(170, 38));
            label.text = "Закрыть";
            label.alignment = TextAnchor.MiddleCenter;
            label.raycastTarget = false;
        }

        private static Text MakeText(string name, Transform parent, int size, FontStyle style,
            Vector2 position, Vector2 dimensions)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var text = go.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = size;
            text.fontStyle = style;
            text.color = new Color(0.88f, 0.82f, 0.7f);
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