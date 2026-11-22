-- Calendar cancellation is immediate; releasing Stripe authorisation remains durable.
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.appointment_change(uuid,text,text,timestamptz,text)'::regprocedure);
 if position('set payment_state=''cancelling'',hold_until=null' in definition)=0 then raise exception 'cancellation_function_changed';end if;
 definition:=replace(definition,'set payment_state=''cancelling'',hold_until=null','set status=''cancelled'',payment_state=''cancelling'',hold_until=null');
 definition:=replace(definition,'where id=p_id;return;','where id=p_id;perform public.appointment_enqueue(p_id,''cancelled'');return;');
 execute definition;
end $$;

-- Repair previously requested cancellations without erasing payment history or identifiers.
do $$declare booking record;begin
 for booking in update public.appointments set status='cancelled',hold_until=null,updated_at=now()
 where status='pending' and payment_flow='authorize_confirm' and payment_state='cancelling' and not paid returning id loop
  perform public.appointment_enqueue(booking.id,'cancelled');
  insert into public.appointment_audit(appointment_id,actor,action) values(booking.id,'system','finish_previously_requested_calendar_cancellation');
 end loop;
end $$;
