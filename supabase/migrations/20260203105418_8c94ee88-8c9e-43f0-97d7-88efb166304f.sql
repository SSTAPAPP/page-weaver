-- Create all tables for the barber shop management system

-- 1. Members table
CREATE TABLE public.members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('male', 'female')),
    balance DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Services table
CREATE TABLE public.services (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    duration INTEGER,
    category TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Card templates table
CREATE TABLE public.card_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    total_count INTEGER NOT NULL,
    service_ids TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Member cards table
CREATE TABLE public.member_cards (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    template_id UUID,
    template_name TEXT NOT NULL,
    remaining_count INTEGER NOT NULL,
    services TEXT[],
    original_price DECIMAL(10,2) NOT NULL,
    original_total_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Transactions table
CREATE TABLE public.transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id TEXT NOT NULL,
    member_name TEXT NOT NULL,
    type TEXT CHECK (type IN ('recharge', 'consume', 'card_deduct', 'refund', 'price_diff')) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT,
    description TEXT,
    voided BOOLEAN DEFAULT false,
    related_transaction_id UUID,
    sub_transactions JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Appointments table
CREATE TABLE public.appointments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    member_name TEXT NOT NULL,
    member_phone TEXT,
    service_id UUID,
    service_name TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'noshow')) DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Orders table
CREATE TABLE public.orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id TEXT NOT NULL,
    member_name TEXT NOT NULL,
    services JSONB NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payments JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Audit logs table
CREATE TABLE public.audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL,
    category TEXT CHECK (category IN ('member', 'transaction', 'service', 'card', 'system', 'security')) NOT NULL,
    details TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Shop settings table (single row for shop config)
CREATE TABLE public.shop_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_name TEXT DEFAULT 'FFk',
    shop_address TEXT,
    shop_phone TEXT,
    admin_password_hash TEXT,
    theme TEXT DEFAULT 'system',
    font_size TEXT DEFAULT 'base',
    sidebar_collapsed BOOLEAN DEFAULT false,
    sync_config JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Sync queue table for offline-first operations
CREATE TABLE public.sync_queue (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    operation TEXT CHECK (operation IN ('insert', 'update', 'delete')) NOT NULL,
    table_name TEXT NOT NULL,
    data JSONB NOT NULL,
    retries INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access (single-shop system without auth initially)
-- Members policies
CREATE POLICY "Allow all operations on members" ON public.members FOR ALL USING (true) WITH CHECK (true);

-- Services policies
CREATE POLICY "Allow all operations on services" ON public.services FOR ALL USING (true) WITH CHECK (true);

-- Card templates policies
CREATE POLICY "Allow all operations on card_templates" ON public.card_templates FOR ALL USING (true) WITH CHECK (true);

-- Member cards policies
CREATE POLICY "Allow all operations on member_cards" ON public.member_cards FOR ALL USING (true) WITH CHECK (true);

-- Transactions policies
CREATE POLICY "Allow all operations on transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

-- Appointments policies
CREATE POLICY "Allow all operations on appointments" ON public.appointments FOR ALL USING (true) WITH CHECK (true);

-- Orders policies
CREATE POLICY "Allow all operations on orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

-- Audit logs policies
CREATE POLICY "Allow all operations on audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Shop settings policies
CREATE POLICY "Allow all operations on shop_settings" ON public.shop_settings FOR ALL USING (true) WITH CHECK (true);

-- Sync queue policies
CREATE POLICY "Allow all operations on sync_queue" ON public.sync_queue FOR ALL USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shop_settings_updated_at
    BEFORE UPDATE ON public.shop_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default shop settings
INSERT INTO public.shop_settings (shop_name, theme, font_size, sidebar_collapsed)
VALUES ('FFk', 'system', 'base', false);

-- Create indexes for better query performance
CREATE INDEX idx_members_phone ON public.members(phone);
CREATE INDEX idx_members_name ON public.members(name);
CREATE INDEX idx_transactions_member_id ON public.transactions(member_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_member_cards_member_id ON public.member_cards(member_id);
CREATE INDEX idx_appointments_date ON public.appointments(date);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_audit_logs_category ON public.audit_logs(category);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_services_category ON public.services(category);
CREATE INDEX idx_services_is_active ON public.services(is_active);