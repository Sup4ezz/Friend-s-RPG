using System.Collections;
using UnityEngine;
using UnityEngine.UI;

namespace Lorgus.Prototype
{
    /// <summary>Lightweight wake-up beat: black fade and a gentle rise to standing eye height.</summary>
    public sealed class WakeUpSequence : MonoBehaviour
    {
        [SerializeField] private Image eyelidOverlay;
        [SerializeField] private float fadeDuration = 2.2f;
        [SerializeField] private float riseDuration = 1.8f;
        [SerializeField] private float startingEyeHeight = 0.38f;
        [SerializeField] private float standingEyeHeight = 1.65f;

        public void SetOverlay(Image overlay) { eyelidOverlay = overlay; }

        private IEnumerator Start()
        {
            Camera cam = FindObjectOfType<Camera>();
            GridFirstPersonController controller = FindObjectOfType<GridFirstPersonController>();
            if (controller != null) controller.SetInputEnabled(false);
            CharacterController body = controller != null ? controller.GetComponent<CharacterController>() : null;
            Vector3 wakeStartPosition = controller != null ? controller.transform.position : Vector3.zero;
            Vector3 wakeEndPosition = new Vector3(-0.4f, 0f, 0.4f);
            if (body != null) body.enabled = false;
            if (cam != null)
            {
                Vector3 p = cam.transform.localPosition;
                p.y = startingEyeHeight;
                cam.transform.localPosition = p;
            }

            if (eyelidOverlay != null)
            {
                Color c = eyelidOverlay.color;
                c.a = 1f;
                eyelidOverlay.color = c;
                eyelidOverlay.raycastTarget = false;
            }

            float elapsed = 0f;
            while (elapsed < Mathf.Max(fadeDuration, riseDuration))
            {
                elapsed += Time.deltaTime;
                if (cam != null && elapsed <= riseDuration)
                {
                    float t = Mathf.SmoothStep(0f, 1f, elapsed / riseDuration);
                    Vector3 p = cam.transform.localPosition;
                    p.y = Mathf.Lerp(startingEyeHeight, standingEyeHeight, t);
                    cam.transform.localPosition = p;
                    if (controller != null)
                        controller.transform.position = Vector3.Lerp(wakeStartPosition, wakeEndPosition, t);
                }

                if (eyelidOverlay != null && elapsed <= fadeDuration)
                {
                    Color c = eyelidOverlay.color;
                    c.a = 1f - Mathf.SmoothStep(0f, 1f, elapsed / fadeDuration);
                    eyelidOverlay.color = c;
                }
                yield return null;
            }

            if (eyelidOverlay != null)
            {
                Color c = eyelidOverlay.color;
                c.a = 0f;
                eyelidOverlay.color = c;
                eyelidOverlay.gameObject.SetActive(false);
            }

            if (body != null) body.enabled = true;
            if (controller != null)
            {
                controller.SetCameraRestHeight(standingEyeHeight);
                controller.SetInputEnabled(true);
            }
        }
    }
}
