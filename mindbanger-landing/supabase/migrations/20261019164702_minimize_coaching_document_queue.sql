-- Keep only billing facts in the durable document queue, never coaching topics/notes.
create or replace function public.appointment_queue_document() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.kind='booking' and new.payment_intent_id is not null and ((new.paid and not old.paid) or new.stripe_refunded_amount>old.stripe_refunded_amount) then
  insert into public.appointment_document_jobs(appointment_id,booking) values(new.id,jsonb_build_object('id',new.id,'payment_intent_id',new.payment_intent_id,'price',new.price,'customer_name',new.customer_name,'email',new.email,'starts_at',new.starts_at,'ends_at',new.ends_at))
  on conflict(appointment_id) do update set revision=public.appointment_document_jobs.revision+1,available_at=now();
 end if;return new;
end $$;
update public.appointment_document_jobs set booking=jsonb_build_object('id',booking->'id','payment_intent_id',booking->'payment_intent_id','price',booking->'price','customer_name',booking->'customer_name','email',booking->'email','starts_at',booking->'starts_at','ends_at',booking->'ends_at');
revoke all on function public.appointment_queue_document() from public,anon,authenticated;
grant execute on function public.appointment_queue_document() to service_role;
