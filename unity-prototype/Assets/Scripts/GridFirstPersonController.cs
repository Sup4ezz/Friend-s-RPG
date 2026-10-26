using System.Collections;
using UnityEngine;

namespace Lorgus.Prototype
{
    /// <summary>Discrete movement: W/S move one cell; A/D rotate in place by 90 degrees.</summary>
    public sealed class GridFirstPersonController : MonoBehaviour
    {
        [SerializeField] private float cellSize = 1f;
        [SerializeField] private float moveDuration = 0.16f;
        [SerializeField] private float turnDuration = 0.13f;
        [SerializeField] private float collisionRadius = 0.22f;
        [SerializeField] private float interactionDistance = 2.2f;

        private bool busy;
        private bool inputEnabled = true;
        private Camera playerCamera;
        private readonly Collider[] overlapBuffer = new Collider[16];
        private readonly RaycastHit[] raycastBuffer = new RaycastHit[24];
        private RoomInteractionUI interactionUI;
        private RoomInteractable heldObject;
        private Vector3 heldOriginalPosition;

        private void Awake()
        {
            playerCamera = GetComponentInChildren<Camera>();
            interactionUI = FindObjectOfType<RoomInteractionUI>();
            Cursor.lockState = CursorLockMode.Locked;
            Cursor.visible = false;
        }

        private void Update()
        {
            if (Input.GetKeyDown(KeyCode.Escape))
            {
                Cursor.lockState = CursorLockMode.None;
                Cursor.visible = true;
            }
            if (Input.GetMouseButtonDown(0) && Cursor.lockState != CursorLockMode.Locked)
            {
                Cursor.lockState = CursorLockMode.Locked;
                Cursor.visible = false;
            }
            if (!inputEnabled || busy) return;

            if (Input.GetKeyDown(KeyCode.E)) Interact();
            else if (Input.GetKeyDown(KeyCode.F)) ToggleMoveObject();
            else if (Input.GetKeyDown(KeyCode.A)) StartCoroutine(Turn(-1));
            else if (Input.GetKeyDown(KeyCode.D)) StartCoroutine(Turn(1));
            else if (Input.GetKeyDown(KeyCode.W)) StartCoroutine(Move(1));
            else if (Input.GetKeyDown(KeyCode.S)) StartCoroutine(Move(-1));
        }

        private void Interact()
        {
            if (playerCamera == null) return;
            Ray ray = new Ray(playerCamera.transform.position, playerCamera.transform.forward);
            int hitCount = Physics.RaycastNonAlloc(ray, raycastBuffer, interactionDistance, ~0, QueryTriggerInteraction.Ignore);
            // Several decorative meshes can overlap an inspection target; inspect the nearest valid target, not just the first collider.
            for (int i = 0; i < hitCount; i++)
            {
                for (int j = i + 1; j < hitCount; j++)
                {
                    if (raycastBuffer[j].distance < raycastBuffer[i].distance)
                    {
                        RaycastHit swap = raycastBuffer[i];
                        raycastBuffer[i] = raycastBuffer[j];
                        raycastBuffer[j] = swap;
                    }
                }
                RoomInteractable target = raycastBuffer[i].collider.GetComponentInParent<RoomInteractable>();
                if (target == null) continue;
                if (interactionUI != null) interactionUI.Show(target);
                return;
            }
            if (interactionUI != null) interactionUI.Show("Тишина", "Вы не замечаете ничего, с чем можно было бы взаимодействовать.");
        }

        private void ToggleMoveObject()
        {
            if (heldObject != null)
            {
                heldObject.transform.position = new Vector3(
                    Mathf.Clamp(Mathf.Round(heldObject.transform.position.x), -3.2f, 3.2f),
                    heldOriginalPosition.y,
                    Mathf.Clamp(Mathf.Round(heldObject.transform.position.z), -3.2f, 3.2f));
                heldObject = null;
                if (interactionUI != null) interactionUI.ShowText("Предмет поставлен", "Предмет возвращён в комнату.");
                return;
            }
            if (playerCamera == null) return;
            Ray ray = new Ray(playerCamera.transform.position, playerCamera.transform.forward);
            if (!Physics.Raycast(ray, out RaycastHit hit, interactionDistance, ~0, QueryTriggerInteraction.Ignore)) return;
            RoomInteractable target = hit.collider.GetComponentInParent<RoomInteractable>();
            if (target == null || !target.Movable)
            {
                if (interactionUI != null) interactionUI.ShowText("Не сдвинуть", "Этот предмет закреплён или слишком тяжёлый.");
                return;
            }
            heldObject = target;
            heldOriginalPosition = target.transform.position;
            if (interactionUI != null) interactionUI.ShowText("Предмет взят", "Перемещайтесь W/S и поворачивайтесь A/D. Нажмите F, чтобы поставить предмет.");
        }

        private void LateUpdate()
        {
            if (heldObject == null || playerCamera == null) return;
            Vector3 target = transform.position + transform.forward * 1.2f;
            target.y = heldOriginalPosition.y;
            heldObject.transform.position = Vector3.Lerp(heldObject.transform.position, target, Time.deltaTime * 10f);
        }

        private IEnumerator Turn(int direction)
        {
            busy = true;
            Quaternion start = transform.rotation;
            Quaternion end = Quaternion.Euler(0, transform.eulerAngles.y + direction * 90f, 0);
            float elapsed = 0f;
            while (elapsed < turnDuration)
            {
                elapsed += Time.deltaTime;
                transform.rotation = Quaternion.Slerp(start, end, Mathf.Clamp01(elapsed / turnDuration));
                yield return null;
            }
            transform.rotation = end;
            busy = false;
        }

        private IEnumerator Move(int sign)
        {
            Vector3 forward = transform.forward;
            Vector3 destination = transform.position + forward * (cellSize * sign);
            if (IsBlocked(destination)) yield break;

            busy = true;
            Vector3 start = transform.position;
            float elapsed = 0f;
            while (elapsed < moveDuration)
            {
                elapsed += Time.deltaTime;
                transform.position = Vector3.Lerp(start, destination, Mathf.Clamp01(elapsed / moveDuration));
                yield return null;
            }
            transform.position = destination;
            busy = false;
        }

        private bool IsBlocked(Vector3 destination)
        {
            int count = Physics.OverlapSphereNonAlloc(
                new Vector3(destination.x, 0.9f, destination.z),
                collisionRadius,
                overlapBuffer,
                ~0,
                QueryTriggerInteraction.Ignore);
            for (int i = 0; i < count; i++)
            {
                Collider candidate = overlapBuffer[i];
                if (candidate == null || candidate.transform.IsChildOf(transform)) continue;
                if (candidate.bounds.size.y < 0.2f) continue;
                return true;
            }
            return false;
        }

        public void SetInputEnabled(bool enabled)
        {
            inputEnabled = enabled;
            if (!enabled)
            {
                StopAllCoroutines();
                busy = false;
            }
        }

        private void OnDisable()
        {
            StopAllCoroutines();
            busy = false;
        }
    }
}
