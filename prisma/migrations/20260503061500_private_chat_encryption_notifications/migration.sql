-- Chat notifications should not copy private message text now that message bodies are encrypted at rest.
create or replace function public.on_message_created_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lid uuid;
  bid uuid;
  listing_owner uuid;
  recipient uuid;
begin
  select c.listing_id, c.buyer_id into lid, bid
  from public.conversations c
  where c.id = new.conversation_id;

  if lid is null or bid is null then
    return new;
  end if;

  select l.user_id into listing_owner from public.waste_listings l where l.id = lid;
  if listing_owner is null then
    return new;
  end if;

  if new.sender_id = bid then
    recipient := listing_owner;
  elsif new.sender_id = listing_owner then
    recipient := bid;
  else
    return new;
  end if;

  insert into public.notifications (id, user_id, type, title, body, listing_id, conversation_id)
  values (
    gen_random_uuid(),
    recipient,
    'chat_message',
    'New encrypted message',
    'Open the conversation to read this private message.',
    lid,
    new.conversation_id
  );

  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;
