-- Players may edit only the narrative fields of their own pending application.
-- System-owned identity, ownership, approval, status, photo and review fields remain server-controlled.
revoke update on table public.character_applications from authenticated;
revoke update (
    id,
    player_id,
    character_id,
    status,
    photo_path,
    review_notes,
    created_at,
    updated_at,
    approved_at,
    rejected_at,
    last_reviewed_at
) on table public.character_applications from authenticated;

grant update (
    name,
    race,
    age,
    homeland,
    personality,
    backstory,
    special_skills,
    preferred_weapon,
    occupation
) on table public.character_applications to authenticated;
