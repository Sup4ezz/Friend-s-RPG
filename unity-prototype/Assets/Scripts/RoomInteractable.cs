using UnityEngine;

namespace Lorgus.Prototype
{
    /// <summary>Small, local-only interaction target for props in the bedroom.</summary>
    public sealed class RoomInteractable : MonoBehaviour
    {
        [SerializeField] private string displayName = "Предмет";
        [SerializeField, TextArea(2, 5)] private string description = "На первый взгляд ничего необычного.";

        public string DisplayName => displayName;
        public string Description => description;

        public void Configure(string title, string details)
        {
            displayName = title;
            description = details;
        }
    }
}
