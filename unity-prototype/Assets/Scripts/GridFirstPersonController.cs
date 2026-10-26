using UnityEngine;

namespace Lorgus.Prototype
{
    /// <summary>First-person movement, mouse look and room interaction for the Windows prototype.</summary>
    public sealed class GridFirstPersonController : MonoBehaviour
    {
        [SerializeField] private float moveSpeed = 2.8f;
        [SerializeField] private float mouseSensitivity = 1.8f;
        [SerializeField] private float gravity = -18f;
        [SerializeField] private float interactionDistance = 2.2f;

        private bool inputEnabled = true;
        private Camera playerCamera;
        private CharacterController characterController;
        private float cameraPitch;
        private float verticalVelocity;
        private float bobPhase;
        private Vector3 cameraRestPosition;
        private readonly RaycastHit[] raycastBuffer = new RaycastHit[24];
        private RoomInteractionUI interactionUI;

        private void Awake()
        {
            playerCamera = GetComponentInChildren<Camera>();
            characterController = GetComponent<CharacterController>();
            interactionUI = FindObjectOfType<RoomInteractionUI>();
            if (playerCamera != null)
            {
                cameraRestPosition = playerCamera.transform.localPosition;
                cameraPitch = playerCamera.transform.localEulerAngles.x;
                if (cameraPitch > 180f) cameraPitch -= 360f;
            }
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

            if (!inputEnabled || Cursor.lockState != CursorLockMode.Locked) return;

            Look();
            MovePlayer();

            if (Input.GetKeyDown(KeyCode.E)) Interact();
        }

        private void Look()
        {
            if (playerCamera == null) return;
            float yaw = Input.GetAxis("Mouse X") * mouseSensitivity;
            float pitch = Input.GetAxis("Mouse Y") * mouseSensitivity;
            transform.Rotate(0f, yaw, 0f, Space.Self);
            cameraPitch = Mathf.Clamp(cameraPitch - pitch, -78f, 78f);
            playerCamera.transform.localRotation = Quaternion.Euler(cameraPitch, 0f, 0f);
        }

        private void MovePlayer()
        {
            if (characterController == null) return;
            Vector2 input = new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
            input = Vector2.ClampMagnitude(input, 1f);
            Vector3 planar = (transform.right * input.x + transform.forward * input.y) * moveSpeed;
            characterController.Move(planar * Time.deltaTime);

            if (characterController.isGrounded && verticalVelocity < 0f)
                verticalVelocity = -2f;
            else
                verticalVelocity += gravity * Time.deltaTime;
            characterController.Move(Vector3.up * (verticalVelocity * Time.deltaTime));

            float moving = input.sqrMagnitude;
            bobPhase += Time.deltaTime * (moving > 0.01f ? 9f : 2.2f);
            float bob = moving > 0.01f ? Mathf.Sin(bobPhase) * 0.018f : 0f;
            playerCamera.transform.localPosition = cameraRestPosition + Vector3.up * bob;
        }

        private void Interact()
        {
            if (playerCamera == null) return;
            Ray ray = new Ray(playerCamera.transform.position, playerCamera.transform.forward);
            int hitCount = Physics.RaycastNonAlloc(ray, raycastBuffer, interactionDistance, ~0, QueryTriggerInteraction.Ignore);
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
            if (interactionUI != null) interactionUI.ShowText("Тишина", "Вы не замечаете ничего, с чем можно было бы взаимодействовать.");
        }

        public void SetInputEnabled(bool enabled)
        {
            inputEnabled = enabled;
            if (!enabled)
            {
                verticalVelocity = 0f;
            }
        }

        private void OnDisable()
        {
        }
    }
}
