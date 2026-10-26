using System;
using System.Collections;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.UI;
using UnityEngine.EventSystems;

namespace Lorgus.Prototype
{
    /// <summary>
    /// Interactive cosmic entry scene. Authenticates against the existing Supabase project,
    /// checks the authenticated user's character applications, and only then opens the room.
    /// Stores a DPAPI-protected refresh token (never a plaintext password) when requested.
    /// </summary>
    public sealed class CosmicLoginController : MonoBehaviour
    {
        private const string SupabaseUrl = "https://dxdxnttpznoekaiecrlv.supabase.co";
        private const string PublishableKey = "sb_publishable_LlRg71tECimoRn2zuzxqlQ_OeCupPLe";
        private const string RememberKey = "lorgus.remember";
        private const string RefreshTokenKey = "lorgus.refresh_token.dpapi";

        private LorgusPrototypeBootstrap bootstrap;
        private GameObject cosmicRoot;
        private GameObject uiRoot;
        private InputField emailField;
        private InputField passwordField;
        private Toggle rememberToggle;
        private Text statusText;
        private Button loginButton;
        private Button registerButton;
        private bool requestInProgress;
        private string accessToken;
        private string refreshToken;
        private string userId;

        [Serializable] private sealed class AuthUser { public string id; public string email; }
        [Serializable] private sealed class AuthResponse
        {
            public string access_token;
            public string refresh_token;
            public AuthUser user;
            public string msg;
            public string message;
            public string error_description;
        }
        [Serializable] private sealed class ApplicationRow
        {
            public string status;
            public string character_id;
            public string name;
        }
        [Serializable] private sealed class ApplicationRows { public ApplicationRow[] items; }

        public void Initialize(LorgusPrototypeBootstrap owner) { bootstrap = owner; }

        private void Start()
        {
            BuildCosmos();
            BuildLoginUI();
            bool remembered = PlayerPrefs.GetInt(RememberKey, 0) == 1;
            rememberToggle.isOn = remembered;
            if (remembered)
            {
                string encrypted = PlayerPrefs.GetString(RefreshTokenKey, "");
                string savedToken = UnprotectToken(encrypted);
                if (!string.IsNullOrEmpty(savedToken))
                {
                    SetStatus("Восстанавливаем сохранённую сессию…");
                    StartCoroutine(RefreshSession(savedToken));
                    return;
                }
                ClearRememberedSession();
                rememberToggle.isOn = false;
            }
            SetStatus("Войдите в ЛОРГУС или создайте аккаунт.");
        }

        private void Update()
        {
            if (cosmicRoot == null || requestInProgress) return;
            // The starfield responds subtly to the pointer without stealing clicks from the form.
            float nx = Screen.width > 0 ? (Input.mousePosition.x / Screen.width - 0.5f) : 0f;
            float ny = Screen.height > 0 ? (Input.mousePosition.y / Screen.height - 0.5f) : 0f;
            Quaternion target = Quaternion.Euler(-ny * 3.5f, nx * 6f, 0f);
            cosmicRoot.transform.rotation = Quaternion.Slerp(cosmicRoot.transform.rotation, target, Time.unscaledDeltaTime * 1.4f);
        }

        private void BuildCosmos()
        {
            cosmicRoot = new GameObject("LORGUS Cosmic Entry");
            var cameraObject = new GameObject("Cosmic Camera");
            cameraObject.transform.SetParent(cosmicRoot.transform, false);
            cameraObject.transform.position = Vector3.zero;
            cameraObject.transform.rotation = Quaternion.identity;
            var camera = cameraObject.AddComponent<Camera>();
            camera.tag = "MainCamera";
            camera.fieldOfView = 58f;
            camera.nearClipPlane = 0.1f;
            camera.farClipPlane = 180f;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.004f, 0.006f, 0.022f);
            cameraObject.AddComponent<AudioListener>();

            var starObject = new GameObject("Distant stars");
            starObject.transform.SetParent(cosmicRoot.transform, false);
            var particles = starObject.AddComponent<ParticleSystem>();
            var main = particles.main;
            main.loop = false;
            main.playOnAwake = false;
            main.maxParticles = 900;
            main.startLifetime = 1000f;
            main.startSpeed = 0f;
            main.startSize = new ParticleSystem.MinMaxCurve(0.025f, 0.085f);
            main.startColor = new ParticleSystem.MinMaxGradient(new Color(0.72f, 0.78f, 1f, 0.9f), new Color(1f, 0.83f, 0.62f, 0.9f));
            main.simulationSpace = ParticleSystemSimulationSpace.Local;
            var emission = particles.emission;
            emission.enabled = false;
            var renderer = starObject.GetComponent<ParticleSystemRenderer>();
            Shader starShader = Shader.Find("Particles/Standard Unlit");
            if (starShader == null) starShader = Shader.Find("Sprites/Default");
            if (starShader != null) renderer.material = new Material(starShader);
            var stars = new ParticleSystem.Particle[720];
            for (int i = 0; i < stars.Length; i++)
            {
                stars[i].position = UnityEngine.Random.onUnitSphere * UnityEngine.Random.Range(35f, 115f);
                stars[i].startSize = UnityEngine.Random.Range(0.025f, 0.09f);
                stars[i].startColor = UnityEngine.Random.value > 0.82f
                    ? new Color(1f, 0.77f, 0.53f, 0.9f)
                    : new Color(0.68f, 0.76f, 1f, 0.88f);
                stars[i].remainingLifetime = 1000f;
                stars[i].startLifetime = 1000f;
            }
            particles.SetParticles(stars, stars.Length);
            particles.Play();

            var keyLightObject = new GameObject("Cosmic soft light");
            keyLightObject.transform.SetParent(cosmicRoot.transform, false);
            keyLightObject.transform.rotation = Quaternion.Euler(28f, -32f, 0f);
            var keyLight = keyLightObject.AddComponent<Light>();
            keyLight.type = LightType.Directional;
            keyLight.intensity = 0.9f;
            keyLight.color = new Color(0.62f, 0.7f, 1f);

            CreatePlanet("The distant amber world", new Vector3(-12f, 5f, 48f), 5.2f, new Color(0.35f, 0.18f, 0.1f));
            CreatePlanet("The blue world", new Vector3(13f, -3f, 64f), 8.2f, new Color(0.075f, 0.14f, 0.32f));
            CreatePlanet("The pale moon", new Vector3(7f, 8f, 39f), 1.35f, new Color(0.52f, 0.51f, 0.48f));
            CreateConstellation(new Vector3[] {
                new Vector3(-10, 2, 28), new Vector3(-7, 5, 28), new Vector3(-3, 3, 28),
                new Vector3(0, 7, 28), new Vector3(3, 5, 28), new Vector3(7, 8, 28)
            });
            CreateConstellation(new Vector3[] {
                new Vector3(8, -4, 31), new Vector3(11, -1, 31), new Vector3(14, -3, 31),
                new Vector3(16, 1, 31), new Vector3(19, 0, 31)
            });
        }

        private void CreatePlanet(string objectName, Vector3 position, float size, Color color)
        {
            var planet = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            planet.name = objectName;
            planet.transform.SetParent(cosmicRoot.transform, false);
            planet.transform.position = position;
            planet.transform.localScale = Vector3.one * size;
            var collider = planet.GetComponent<Collider>();
            if (collider != null) Destroy(collider);
            var renderer = planet.GetComponent<Renderer>();
            var shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) shader = Shader.Find("Standard");
            if (shader == null) shader = Shader.Find("Unlit/Color");
            if (shader != null)
            {
                var material = new Material(shader);
                material.color = color;
                renderer.material = material;
            }
        }

        private void CreateConstellation(Vector3[] points)
        {
            var lineObject = new GameObject("Constellation");
            lineObject.transform.SetParent(cosmicRoot.transform, false);
            var line = lineObject.AddComponent<LineRenderer>();
            line.positionCount = points.Length;
            line.SetPositions(points);
            line.startWidth = 0.025f;
            line.endWidth = 0.012f;
            line.useWorldSpace = true;
            var shader = Shader.Find("Sprites/Default");
            if (shader != null)
            {
                line.material = new Material(shader);
                line.startColor = new Color(0.38f, 0.48f, 0.75f, 0.55f);
                line.endColor = new Color(0.58f, 0.47f, 0.73f, 0.25f);
            }
        }

        private void BuildLoginUI()
        {
            // The same EventSystem serves the cosmic form and later room-overlay buttons.
            if (FindObjectOfType<EventSystem>() == null)
            {
                var eventSystemObject = new GameObject("LORGUS EventSystem");
                eventSystemObject.AddComponent<EventSystem>();
                eventSystemObject.AddComponent<StandaloneInputModule>();
            }
            uiRoot = new GameObject("Cosmic Login UI");
            var canvas = uiRoot.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 50;
            var scaler = uiRoot.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920, 1080);
            uiRoot.AddComponent<GraphicRaycaster>();

            MakeLabel(canvas.transform, "LORGUS", 52, FontStyle.Bold, new Vector2(0, 275), new Vector2(720, 80));
            MakeLabel(canvas.transform, "МЕЖДУ ЗВЁЗДАМИ НЕТ ДОРОГ — ТОЛЬКО ПУТЬ", 18, FontStyle.Normal,
                new Vector2(0, 225), new Vector2(720, 42));

            emailField = MakeInput(canvas.transform, "Электронная почта", new Vector2(0, 105), false);
            passwordField = MakeInput(canvas.transform, "Пароль", new Vector2(0, 35), true);
            rememberToggle = MakeToggle(canvas.transform, new Vector2(0, -20), "ЗАПОМНИТЬ ДАННЫЕ");
            loginButton = MakeButton(canvas.transform, "ВОЙТИ", new Vector2(-105, -88), new Vector2(200, 54), Login);
            registerButton = MakeButton(canvas.transform, "СОЗДАТЬ АККАУНТ", new Vector2(120, -88), new Vector2(245, 54), Register);
            statusText = MakeLabel(canvas.transform, "", 17, FontStyle.Normal, new Vector2(0, -175), new Vector2(850, 76));
            statusText.alignment = TextAnchor.MiddleCenter;
        }

        private InputField MakeInput(Transform parent, string placeholder, Vector2 position, bool password)
        {
            var root = new GameObject(password ? "Password input" : "Email input");
            root.transform.SetParent(parent, false);
            var rect = root.AddComponent<RectTransform>();
            rect.anchorMin = rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = position;
            rect.sizeDelta = new Vector2(450, 52);
            var image = root.AddComponent<Image>();
            image.color = new Color(0.035f, 0.04f, 0.075f, 0.92f);
            var input = root.AddComponent<InputField>();
            var text = MakeLabel(root.transform, "", 20, FontStyle.Normal, Vector2.zero, new Vector2(410, 44));
            text.alignment = TextAnchor.MiddleLeft;
            text.color = new Color(0.92f, 0.88f, 0.8f);
            input.textComponent = text;
            var hint = MakeLabel(root.transform, placeholder, 18, FontStyle.Italic, Vector2.zero, new Vector2(410, 44));
            hint.alignment = TextAnchor.MiddleLeft;
            hint.color = new Color(0.55f, 0.58f, 0.68f);
            input.placeholder = hint;
            input.contentType = password ? InputField.ContentType.Password : InputField.ContentType.EmailAddress;
            input.lineType = InputField.LineType.SingleLine;
            input.targetGraphic = image;
            input.characterLimit = password ? 256 : 320;
            return input;
        }

        private Toggle MakeToggle(Transform parent, Vector2 position, string label)
        {
            var root = new GameObject("Remember credentials toggle");
            root.transform.SetParent(parent, false);
            var rect = root.AddComponent<RectTransform>();
            rect.anchorMin = rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = position;
            rect.sizeDelta = new Vector2(450, 38);
            var toggle = root.AddComponent<Toggle>();
            var box = new GameObject("Checkbox");
            box.transform.SetParent(root.transform, false);
            var boxRect = box.AddComponent<RectTransform>();
            boxRect.anchorMin = boxRect.anchorMax = new Vector2(0f, 0.5f);
            boxRect.anchoredPosition = new Vector2(15, 0);
            boxRect.sizeDelta = new Vector2(24, 24);
            var boxImage = box.AddComponent<Image>();
            boxImage.color = new Color(0.22f, 0.19f, 0.17f, 1f);
            var check = new GameObject("Check");
            check.transform.SetParent(box.transform, false);
            var checkRect = check.AddComponent<RectTransform>();
            checkRect.anchorMin = Vector2.zero;
            checkRect.anchorMax = Vector2.one;
            checkRect.offsetMin = new Vector2(4, 4);
            checkRect.offsetMax = new Vector2(-4, -4);
            var checkImage = check.AddComponent<Image>();
            checkImage.color = new Color(0.83f, 0.67f, 0.36f, 1f);
            toggle.targetGraphic = boxImage;
            toggle.graphic = checkImage;
            toggle.isOn = false;
            var labelText = MakeLabel(root.transform, label, 17, FontStyle.Bold, new Vector2(105, 0), new Vector2(300, 34));
            labelText.alignment = TextAnchor.MiddleLeft;
            labelText.color = new Color(0.88f, 0.81f, 0.67f);
            return toggle;
        }

        private Button MakeButton(Transform parent, string caption, Vector2 position, Vector2 size, UnityEngine.Events.UnityAction action)
        {
            var root = new GameObject(caption + " button");
            root.transform.SetParent(parent, false);
            var rect = root.AddComponent<RectTransform>();
            rect.anchorMin = rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = position;
            rect.sizeDelta = size;
            var image = root.AddComponent<Image>();
            image.color = new Color(0.36f, 0.25f, 0.13f, 0.96f);
            var button = root.AddComponent<Button>();
            button.targetGraphic = image;
            button.onClick.AddListener(action);
            var text = MakeLabel(root.transform, caption, 17, FontStyle.Bold, Vector2.zero, size - new Vector2(12, 8));
            text.alignment = TextAnchor.MiddleCenter;
            text.raycastTarget = false;
            return button;
        }

        private Text MakeLabel(Transform parent, string value, int size, FontStyle style, Vector2 position, Vector2 dimensions)
        {
            var root = new GameObject("Text");
            root.transform.SetParent(parent, false);
            var text = root.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.text = value;
            text.fontSize = size;
            text.fontStyle = style;
            text.color = new Color(0.9f, 0.84f, 0.72f);
            text.alignment = TextAnchor.MiddleCenter;
            var rect = text.rectTransform;
            rect.anchorMin = rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = position;
            rect.sizeDelta = dimensions;
            return text;
        }

        private void Login()
        {
            if (requestInProgress) return;
            string email = emailField.text.Trim();
            string password = passwordField.text;
            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
            {
                SetStatus("Введите электронную почту и пароль.");
                return;
            }
            StartCoroutine(Authenticate(email, password, false));
        }

        private void Register()
        {
            if (requestInProgress) return;
            string email = emailField.text.Trim();
            string password = passwordField.text;
            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
            {
                SetStatus("Для регистрации заполните почту и пароль.");
                return;
            }
            if (password.Length < 6)
            {
                SetStatus("Пароль должен содержать не менее 6 символов.");
                return;
            }
            StartCoroutine(Authenticate(email, password, true));
        }

        private IEnumerator Authenticate(string email, string password, bool register)
        {
            requestInProgress = true;
            SetButtonsEnabled(false);
            SetStatus(register ? "Создаём аккаунт…" : "Проверяем учётные данные…");
            string endpoint = register ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password";
            string payload = JsonUtility.ToJson(new Credentials { email = email, password = password });
            AuthResponse auth = null;
            string error = null;
            yield return SendJson("POST", SupabaseUrl + endpoint, payload, null, response =>
            {
                if (response.result == UnityWebRequest.Result.Success)
                    auth = JsonUtility.FromJson<AuthResponse>(response.downloadHandler.text);
                else
                    error = DescribeError(response);
            });

            if (register)
            {
                if (auth != null && !string.IsNullOrEmpty(auth.access_token))
                {
                    SetStatus("Аккаунт создан. Проверяем доступ к персонажу…");
                    AcceptSession(auth);
                    yield return CheckApplication();
                }
                else if (auth != null && auth.user != null)
                {
                    SetStatus("Аккаунт создан. Подтвердите электронную почту, затем войдите.");
                }
                else SetStatus("Не удалось создать аккаунт: " + (error ?? "неизвестный ответ сервера"));
            }
            else if (auth != null && !string.IsNullOrEmpty(auth.access_token))
            {
                AcceptSession(auth);
                yield return CheckApplication();
            }
            else SetStatus("Вход не выполнен: " + (error ?? "сервер не вернул сессию"));

            requestInProgress = false;
            SetButtonsEnabled(true);
        }

        [Serializable] private sealed class Credentials { public string email; public string password; }

        private void AcceptSession(AuthResponse auth)
        {
            accessToken = auth.access_token;
            refreshToken = auth.refresh_token;
            userId = auth.user != null ? auth.user.id : null;
            if (rememberToggle.isOn)
            {
                string protectedToken = ProtectToken(refreshToken);
                if (!string.IsNullOrEmpty(protectedToken))
                {
                    PlayerPrefs.SetInt(RememberKey, 1);
                    PlayerPrefs.SetString(RefreshTokenKey, protectedToken);
                    PlayerPrefs.Save();
                }
                else
                {
                    ClearRememberedSession();
                    SetStatus("Вход выполнен, но безопасное сохранение сессии недоступно. В следующий раз войдите вручную.");
                }
            }
            else ClearRememberedSession();
        }

        private IEnumerator RefreshSession(string savedToken)
        {
            requestInProgress = true;
            SetButtonsEnabled(false);
            string payload = JsonUtility.ToJson(new RefreshRequest { refresh_token = savedToken });
            AuthResponse auth = null;
            yield return SendJson("POST", SupabaseUrl + "/auth/v1/token?grant_type=refresh_token", payload, null, response =>
            {
                if (response.result == UnityWebRequest.Result.Success)
                    auth = JsonUtility.FromJson<AuthResponse>(response.downloadHandler.text);
            });
            if (auth != null && !string.IsNullOrEmpty(auth.access_token))
            {
                AcceptSession(auth);
                yield return CheckApplication();
            }
            else
            {
                ClearRememberedSession();
                rememberToggle.isOn = false;
                SetStatus("Сохранённая сессия истекла. Войдите снова.");
            }
            requestInProgress = false;
            SetButtonsEnabled(true);
        }

        [Serializable] private sealed class RefreshRequest { public string refresh_token; }

        private IEnumerator CheckApplication()
        {
            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(accessToken))
            {
                SetStatus("Сессия неполная. Войдите повторно.");
                yield break;
            }
            SetStatus("Проверяем статус анкеты персонажа…");
            string url = SupabaseUrl + "/rest/v1/character_applications?select=status,character_id,name&player_id=eq."
                + UnityWebRequest.EscapeURL(userId);
            string responseBody = null;
            string error = null;
            yield return SendJson("GET", url, null, accessToken, response =>
            {
                if (response.result == UnityWebRequest.Result.Success)
                    responseBody = response.downloadHandler.text;
                else
                    error = DescribeError(response);
            });

            if (responseBody == null)
            {
                SetStatus("Не удалось безопасно проверить анкету. Вход в комнату запрещён. " + (error ?? ""));
                yield break;
            }

            ApplicationRows rows;
            try { rows = JsonUtility.FromJson<ApplicationRows>("{\"items\":" + responseBody + "}"); }
            catch { rows = null; }
            if (rows == null || rows.items == null)
            {
                SetStatus("Сервер вернул неизвестный формат анкеты. Вход в комнату запрещён.");
                yield break;
            }

            foreach (ApplicationRow row in rows.items)
            {
                if (row != null && row.status == "approved" && !string.IsNullOrEmpty(row.character_id))
                {
                    SetStatus("Анкета одобрена. Добро пожаловать.");
                    Destroy(uiRoot);
                    if (cosmicRoot != null) Destroy(cosmicRoot);
                    bootstrap.EnterRoomAfterApproval();
                    yield break;
                }
            }

            bool pending = false;
            bool rejected = false;
            bool revision = false;
            foreach (ApplicationRow row in rows.items)
            {
                if (row == null) continue;
                pending |= row.status == "pending";
                rejected |= row.status == "rejected";
                revision |= row.status == "revision";
            }
            if (pending) SetStatus("Анкета ожидает одобрения. Комната пока недоступна.");
            else if (revision) SetStatus("Анкета требует исправлений. Обновите её на сайте LORGUS.");
            else if (rejected) SetStatus("Анкета отклонена. Комната недоступна.");
            else SetStatus("Для этого аккаунта не найдена одобренная анкета персонажа. Комната недоступна.");
        }

        private IEnumerator SendJson(string method, string url, string payload, string bearer, Action<UnityWebRequest> completed)
        {
            using (var request = new UnityWebRequest(url, method))
            {
                request.downloadHandler = new DownloadHandlerBuffer();
                if (payload != null)
                {
                    request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(payload));
                    request.SetRequestHeader("Content-Type", "application/json");
                }
                request.SetRequestHeader("apikey", PublishableKey);
                request.SetRequestHeader("Accept", "application/json");
                if (!string.IsNullOrEmpty(bearer)) request.SetRequestHeader("Authorization", "Bearer " + bearer);
                request.timeout = 20;
                yield return request.SendWebRequest();
                completed?.Invoke(request);
            }
        }

        private string DescribeError(UnityWebRequest response)
        {
            string body = response.downloadHandler != null ? response.downloadHandler.text : "";
            if (string.IsNullOrWhiteSpace(body)) return response.error ?? "ошибка сети";
            try
            {
                var parsed = JsonUtility.FromJson<AuthResponse>(body);
                if (parsed != null)
                {
                    if (!string.IsNullOrEmpty(parsed.msg)) return parsed.msg;
                    if (!string.IsNullOrEmpty(parsed.message)) return parsed.message;
                    if (!string.IsNullOrEmpty(parsed.error_description)) return parsed.error_description;
                }
            }
            catch { }
            return response.error ?? ("HTTP " + response.responseCode);
        }

        private void SetStatus(string message)
        {
            if (statusText != null) statusText.text = message;
        }

        private void SetButtonsEnabled(bool enabled)
        {
            if (loginButton != null) loginButton.interactable = enabled;
            if (registerButton != null) registerButton.interactable = enabled;
        }

        private void ClearRememberedSession()
        {
            PlayerPrefs.DeleteKey(RememberKey);
            PlayerPrefs.DeleteKey(RefreshTokenKey);
            PlayerPrefs.Save();
        }

        private string ProtectToken(string token)
        {
            if (string.IsNullOrEmpty(token)) return null;
#if UNITY_STANDALONE_WIN || UNITY_EDITOR_WIN
            try
            {
                byte[] bytes = Encoding.UTF8.GetBytes(token);
                DataBlob input = DataBlob.FromBytes(bytes);
                DataBlob output;
                bool ok = CryptProtectData(ref input, "LORGUS session", IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, 1, out output);
                Marshal.FreeHGlobal(input.pbData);
                if (!ok) return null;
                byte[] protectedBytes = new byte[output.cbData];
                Marshal.Copy(output.pbData, protectedBytes, 0, output.cbData);
                LocalFree(output.pbData);
                return Convert.ToBase64String(protectedBytes);
            }
            catch { return null; }
#else
            return null;
#endif
        }

        private string UnprotectToken(string encoded)
        {
            if (string.IsNullOrEmpty(encoded)) return null;
#if UNITY_STANDALONE_WIN || UNITY_EDITOR_WIN
            try
            {
                byte[] bytes = Convert.FromBase64String(encoded);
                DataBlob input = DataBlob.FromBytes(bytes);
                DataBlob output;
                bool ok = CryptUnprotectData(ref input, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, 1, out output);
                Marshal.FreeHGlobal(input.pbData);
                if (!ok) return null;
                byte[] clear = new byte[output.cbData];
                Marshal.Copy(output.pbData, clear, 0, output.cbData);
                LocalFree(output.pbData);
                return Encoding.UTF8.GetString(clear);
            }
            catch { return null; }
#else
            return null;
#endif
        }

#if UNITY_STANDALONE_WIN || UNITY_EDITOR_WIN
        [StructLayout(LayoutKind.Sequential)]
        private struct DataBlob
        {
            public int cbData;
            public IntPtr pbData;
            public static DataBlob FromBytes(byte[] bytes)
            {
                DataBlob blob = new DataBlob { cbData = bytes.Length, pbData = Marshal.AllocHGlobal(bytes.Length) };
                Marshal.Copy(bytes, 0, blob.pbData, bytes.Length);
                return blob;
            }
        }
        [DllImport("crypt32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern bool CryptProtectData(ref DataBlob input, string description, IntPtr entropy, IntPtr reserved,
            IntPtr prompt, int flags, out DataBlob output);
        [DllImport("crypt32.dll", SetLastError = true)]
        private static extern bool CryptUnprotectData(ref DataBlob input, IntPtr description, IntPtr entropy, IntPtr reserved,
            IntPtr prompt, int flags, out DataBlob output);
        [DllImport("kernel32.dll")]
        private static extern IntPtr LocalFree(IntPtr memory);
#endif
    }
}