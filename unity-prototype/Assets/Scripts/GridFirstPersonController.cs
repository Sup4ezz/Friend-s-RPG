using System.Collections;
using UnityEngine;

namespace Lorgus.Prototype
{
    /// <summary>
    /// Discrete grid movement: W/S move one cell, A/D rotate in place by 90 degrees.
    /// Collision uses a small overlap query rather than a full character physics simulation.
    /// </summary>
    public sealed class GridFirstPersonController : MonoBehaviour
    {
        [SerializeField] private float cellSize = 1f;
        [SerializeField] private float moveDuration = 0.16f;
        [SerializeField] private float turnDuration = 0.13f;
        [SerializeField] private float collisionRadius = 0.22f;

        private bool busy;
        private bool inputEnabled = true;
        private Camera playerCamera;
        private int facing; // 0 north, 1 east, 2 south, 3 west
        private readonly Collider[] overlapBuffer = new Collider[12];

        private void Awake()
        {
            playerCamera = GetComponentInChildren<Camera>();
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

            if (Input.GetKeyDown(KeyCode.A)) StartCoroutine(Turn(-1));
            else if (Input.GetKeyDown(KeyCode.D)) StartCoroutine(Turn(1));
            else if (Input.GetKeyDown(KeyCode.W)) StartCoroutine(Move(1));
            else if (Input.GetKeyDown(KeyCode.S)) StartCoroutine(Move(-1));
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
            facing = (facing + direction + 4) % 4;
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
            if (!enabled) StopMovementAndResetBusy();
        }

        private void StopMovementAndResetBusy()
        {
            StopAllCoroutines();
            busy = false;
        }

        private void OnDisable()
        {
            StopAllCoroutines();
            busy = false;
        }
    }
}
