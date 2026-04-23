-- Seller can create conversation rows for (listing, buyer) so they can message buyers who placed offers.
drop policy if exists "conversations_insert_buyer" on public.conversations;
create policy "conversations_insert_participants"
on public.conversations
for insert
to authenticated
with check (
  buyer_id = auth.uid()
  or (
    exists (
      select 1
      from public.waste_listings l
      where l.id = conversations.listing_id
        and l.user_id = auth.uid()
    )
    and buyer_id is distinct from auth.uid()
  )
);

-- Optional IANA timezone for display (e.g. America/Los_Angeles); app falls back to device.
alter table public.users add column if not exists timezone text;

-- Notify listing owner when a new pending offer is created (covers mobile/Supabase inserts).
create or replace function public.on_offer_created_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  if new.status is distinct from 'pending'::"OfferStatus" then
    return new;
  end if;

  select l.user_id into owner_id from public.waste_listings l where l.id = new.listing_id;
  if owner_id is null or owner_id = new.buyer_id then
    return new;
  end if;

  insert into public.notifications (id, user_id, type, title, body, listing_id)
  values (
    gen_random_uuid(),
    owner_id,
    'new_offer',
    'New offer',
    'A buyer submitted an offer on your listing.',
    new.listing_id
  );

  return new;
end;
$$;

drop trigger if exists trg_offers_notify_seller on public.offers;
create trigger trg_offers_notify_seller
after insert on public.offers
for each row execute function public.on_offer_created_notify();

-- Notify the other party on new chat messages + bump conversation.updated_at.
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
  snippet text;
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

  snippet := left(coalesce(new.body, ''), 200);

  insert into public.notifications (id, user_id, type, title, body, listing_id, conversation_id)
  values (
    gen_random_uuid(),
    recipient,
    'chat_message',
    'New message',
    snippet,
    lid,
    new.conversation_id
  );

  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists trg_messages_notify_peer on public.messages;
create trigger trg_messages_notify_peer
after insert on public.messages
for each row execute function public.on_message_created_notify();
