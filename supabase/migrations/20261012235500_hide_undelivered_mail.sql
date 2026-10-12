-- Do not expose the body of a letter to its recipient before delivery.
-- Senders may still read their own outgoing mail; recipients can read only delivered mail.
drop policy if exists "lorgus_mail_select_own" on public.lorgus_mail;

create policy "lorgus_mail_select_own"
on public.lorgus_mail
for select
to authenticated
using (
    sender_player_id = auth.uid()
    or (
        (delivered_at is not null or deliver_at <= now())
        and exists (
            select 1
            from public.character_applications ca
            where ca.character_id = lorgus_mail.recipient_character_id
              and ca.player_id = auth.uid()
              and ca.status = 'approved'
        )
    )
);

-- The UI may only set read_at; the existing trigger makes the timestamp server-controlled.
grant update (read_at) on public.lorgus_mail to authenticated;
