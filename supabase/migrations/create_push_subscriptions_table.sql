create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscription jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Add Row Level Security (RLS) policies
alter table push_subscriptions enable row level security;

-- Allow any user to insert push subscriptions
create policy "Allow insert for all" 
on push_subscriptions
for insert
with check (true);

-- Allow users to view/manage only their own subscriptions
create policy "Allow users to view their own subscriptions" 
on push_subscriptions
for select
using (auth.uid() = subscription->>'user_id');

-- Allow users to update their own subscriptions
create policy "Allow users to update their own subscriptions" 
on push_subscriptions
for update
using (auth.uid() = subscription->>'user_id');

-- Allow users to delete their own subscriptions
create policy "Allow users to delete their own subscriptions" 
on push_subscriptions
for delete
using (auth.uid() = subscription->>'user_id');

-- Create index on user_id to improve query performance
create index idx_push_subscriptions_user_id on push_subscriptions ((subscription->>'user_id'));
