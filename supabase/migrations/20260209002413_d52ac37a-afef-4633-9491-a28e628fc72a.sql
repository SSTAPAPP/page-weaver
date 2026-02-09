-- Enable realtime for core tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
ALTER PUBLICATION supabase_realtime ADD TABLE public.card_templates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
