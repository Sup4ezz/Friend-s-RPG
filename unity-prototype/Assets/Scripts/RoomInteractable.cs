using UnityEngine;

namespace Lorgus.Prototype
{
    public enum RoomObjectRole { Inspect, RpMessages, Inventory, Lorebook, WorldMap, CharacterMirror, TrophyStand, VisitDoor }

    public sealed class RoomInteractable : MonoBehaviour
    {
        [SerializeField] private string displayName = "Предмет";
        [SerializeField, TextArea(2, 5)] private string description = "На первый взгляд ничего необычного.";
        [SerializeField] private RoomObjectRole role = RoomObjectRole.Inspect;
        [SerializeField] private bool movable;

        public string DisplayName => displayName;
        public string Description => description;
        public RoomObjectRole Role => role;
        public bool Movable => movable;

        public void Configure(string title, string details, RoomObjectRole objectRole = RoomObjectRole.Inspect, bool canMove = false)
        {
            displayName = title;
            description = details;
            role = objectRole;
            movable = canMove;
        }
    }
}