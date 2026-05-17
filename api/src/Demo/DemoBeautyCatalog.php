<?php

namespace App\Demo;

final class DemoBeautyCatalog
{
    /**
     * @return array<int, string>
     */
    public static function brandNames(): array
    {
        return [
            'Kérastase',
            'L’Oréal Professionnel',
            'Olaplex',
            'Moroccanoil',
            'Aveda',
            'Redken',
            'Davines',
            'Caudalie',
            'La Roche-Posay',
            'Bioderma',
            'Avène',
            'Nuxe',
            'CeraVe',
            'Dyson',
            'ghd',
            'BaBylissPRO',
            'FOREO',
            'Tangle Teezer',
            'Wet Brush',
            'RefectoCil',
        ];
    }

    /**
     * @return array<int, string>
     */
    public static function categoryNames(): array
    {
        return [
            'Shampoo',
            'Conditioner',
            'Treatment',
            'Styling',
            'Skincare',
            'Accessory',
            'Tools',
            'Scalp care',
            'Beard care',
            'Color',
            'Gift',
            'Wellness',
        ];
    }

    /**
     * @return array<string, array{name:string,description:string,price:string,brand:string,category:string,image:string}>
     */
    public static function productsBySku(): array
    {
        return [
            'PROD-1001' => self::item('Kérastase Bain Elixir Ultime', 'Nourishing shampoo designed to cleanse while leaving the hair softer, shinier and easier to smooth after a salon blow-dry.', '27.90', 'Kérastase', 'Shampoo', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80'),
            'PROD-1002' => self::item('L’Oréal Professionnel Metal Detox Mask', 'Professional anti-metal mask recommended after technical services to help preserve cosmetic color quality and softness.', '31.50', 'L’Oréal Professionnel', 'Treatment', 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80'),
            'PROD-1003' => self::item('Olaplex No.4 Bond Maintenance Shampoo', 'Bond-building shampoo created to cleanse gently while helping weakened or over-processed hair feel stronger.', '29.00', 'Olaplex', 'Shampoo', 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=1200&q=80'),
            'PROD-1004' => self::item('Moroccanoil Treatment Original', 'Iconic argan-oil leave-in treatment used to smooth frizz, add shine and soften dry mid-lengths and ends.', '46.00', 'Moroccanoil', 'Treatment', 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=1200&q=80'),
            'PROD-1005' => self::item('Aveda Botanical Repair Strengthening Conditioner', 'Plant-powered conditioner that helps detangle and soften fragile hair after washing.', '38.00', 'Aveda', 'Conditioner', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80'),
            'PROD-1006' => self::item('Dyson Airwrap i.d. Multi-Styler', 'Premium multi-styler used to dry, curl, smooth and shape a blowout service with one high-end tool.', '549.00', 'Dyson', 'Tools', 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80'),
            'PROD-1007' => self::item('ghd Duet Style Hot Air Styler', 'Hybrid hot-air styler designed to dry and style in a single tool for smooth salon finishes.', '379.00', 'ghd', 'Tools', 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=1200&q=80'),
            'PROD-1008' => self::item('FOREO LUNA 4', 'Silicone facial cleansing and massage device used in premium beauty and skincare routines.', '279.00', 'FOREO', 'Tools', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80'),
            'PROD-1009' => self::item('Caudalie Beauty Elixir', 'Cult face mist used to refresh the complexion and add glow before or after makeup.', '38.00', 'Caudalie', 'Skincare', 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=1200&q=80'),
            'PROD-1010' => self::item('La Roche-Posay Cicaplast Baume B5+', 'Restorative soothing balm appreciated for dry, irritated or post-treatment skin comfort.', '16.90', 'La Roche-Posay', 'Skincare', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=80'),
            'PROD-1011' => self::item('Tangle Teezer The Wet Detangler', 'Detangling brush designed for wet hair, ideal for minimizing breakage during salon aftercare.', '18.00', 'Tangle Teezer', 'Accessory', 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?auto=format&fit=crop&w=1200&q=80'),
            'PROD-1012' => self::item('BaBylissPRO Ceramic Round Brush', 'Professional round brush used for smooth blow-dries, bend and root lift.', '24.90', 'BaBylissPRO', 'Accessory', 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=1200&q=80'),
            'PROD-1016' => self::item('Wet Brush Original Detangler', 'Soft flexible detangling brush suited to everyday salon retail for fine to thick hair.', '16.00', 'Wet Brush', 'Accessory', 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?auto=format&fit=crop&w=1200&q=80'),
            'PROD-1017' => self::item('RefectoCil Silicone Pads', 'Reusable under-eye pads used during lash and brow tint services to keep the area clean and protected.', '11.90', 'RefectoCil', 'Accessory', 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=1200&q=80'),

            'YR-2000' => self::item('Kérastase Genesis Bain Hydra-Fortifiant', 'Fortifying shampoo for fine or weakened hair prone to breakage from brushing.', '29.90', 'Kérastase', 'Shampoo', 'https://images.unsplash.com/photo-1512207846876-bb54ef5056fe?auto=format&fit=crop&w=1200&q=80'),
            'YR-2001' => self::item('Kérastase Nutritive 8H Magic Night Serum', 'Overnight leave-in serum that nourishes dry hair and helps make next-day styling easier.', '52.00', 'Kérastase', 'Treatment', 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=1200&q=80'),
            'YR-2002' => self::item('L’Oréal Professionnel Absolut Repair Molecular Shampoo', 'Repair shampoo developed for very damaged hair in need of softness and cosmetic repair.', '24.00', 'L’Oréal Professionnel', 'Shampoo', 'https://images.unsplash.com/photo-1585232350875-589d4c1dded8?auto=format&fit=crop&w=1200&q=80'),
            'YR-2003' => self::item('L’Oréal Professionnel Metal Detox Oil', 'Concentrated hair oil used after color services for smoothness and glossy protection.', '28.50', 'L’Oréal Professionnel', 'Treatment', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80'),
            'YR-2004' => self::item('Olaplex No.3 Hair Perfector', 'At-home pre-shampoo bond treatment that helps reduce the look of damage between salon visits.', '29.00', 'Olaplex', 'Treatment', 'https://images.unsplash.com/photo-1559599101-f09722fb4948?auto=format&fit=crop&w=1200&q=80'),
            'YR-2005' => self::item('Olaplex No.5 Bond Maintenance Conditioner', 'Bond-building conditioner used to improve softness, slip and shine after cleansing.', '29.00', 'Olaplex', 'Conditioner', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80'),
            'YR-2006' => self::item('Moroccanoil Hydrating Shampoo', 'Moisture-rich shampoo for dehydrated hair that still needs bounce and softness.', '27.00', 'Moroccanoil', 'Shampoo', 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80'),
            'YR-2007' => self::item('Moroccanoil Intense Hydrating Mask', 'Rich weekly mask for thick, dry or sensitized lengths needing softness and manageability.', '43.00', 'Moroccanoil', 'Treatment', 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=1200&q=80'),
            'YR-2008' => self::item('Aveda Botanical Repair Strengthening Shampoo', 'Strengthening shampoo powered by plant technology for damaged or chemically treated hair.', '36.00', 'Aveda', 'Shampoo', 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=1200&q=80'),
            'YR-2009' => self::item('Aveda Invati Ultra Advanced Exfoliating Shampoo Light', 'Scalp-focused shampoo created to cleanse gently and support fuller-looking roots.', '39.00', 'Aveda', 'Scalp care', 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=1200&q=80'),
            'YR-2010' => self::item('Redken Acidic Bonding Concentrate Leave-In Treatment', 'Leave-in treatment that helps protect against heat while smoothing and supporting damaged hair.', '33.00', 'Redken', 'Treatment', 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=1200&q=80'),
            'YR-2011' => self::item('Redken Quick Blowout Heat Protecting Spray', 'Lightweight spray for faster blow-drying and smoother brush work.', '24.00', 'Redken', 'Styling', 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80'),
            'YR-2012' => self::item('Davines OI Shampoo', 'Salon-favorite shampoo that brings softness and shine with a richer cleansing feel.', '29.50', 'Davines', 'Shampoo', 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80'),
            'YR-2013' => self::item('Davines OI All In One Milk', 'Multifunction leave-in milk for softness, shine and easier detangling on all hair types.', '31.00', 'Davines', 'Treatment', 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=1200&q=80'),
            'YR-2014' => self::item('Caudalie Vinoperfect Brightening Dark Spot Serum', 'Glow-boosting serum often chosen for radiance-focused skincare routines.', '52.00', 'Caudalie', 'Skincare', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80'),
            'YR-2015' => self::item('Caudalie Vinosun Protect Invisible High Protection Spray SPF50', 'Body and face sun-care spray suitable for spa and summer beauty retail.', '29.00', 'Caudalie', 'Skincare', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=80'),
            'YR-2016' => self::item('La Roche-Posay Anthelios UVMune 400 Invisible Fluid SPF50+', 'Daily facial sunscreen widely recommended for high protection with a light finish.', '19.90', 'La Roche-Posay', 'Skincare', 'https://images.unsplash.com/photo-1585232350875-589d4c1dded8?auto=format&fit=crop&w=1200&q=80'),
            'YR-2017' => self::item('La Roche-Posay Effaclar Serum Ultra Concentré', 'Exfoliating serum for blemish-prone or texture-focused skincare routines.', '38.00', 'La Roche-Posay', 'Skincare', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80'),
            'YR-2018' => self::item('Bioderma Sensibio H2O', 'Iconic micellar water used to remove makeup gently, even on sensitive skin.', '16.50', 'Bioderma', 'Skincare', 'https://images.unsplash.com/photo-1559599101-f09722fb4948?auto=format&fit=crop&w=1200&q=80'),
            'YR-2019' => self::item('Bioderma Atoderm Shower Oil', 'Comfort-focused cleansing oil suitable for dry skin and wellness retail.', '18.90', 'Bioderma', 'Wellness', 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=1200&q=80'),
            'YR-2020' => self::item('Avène Cicalfate+ Restorative Protective Cream', 'Soothing restorative cream chosen for fragile or sensitized skin comfort.', '15.90', 'Avène', 'Skincare', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=80'),
            'YR-2021' => self::item('Avène Thermal Spring Water Spray', 'Signature soothing mist used to refresh skin after treatment or throughout the day.', '10.90', 'Avène', 'Skincare', 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=1200&q=80'),
            'YR-2022' => self::item('Nuxe Huile Prodigieuse', 'Multi-purpose dry oil for body and hair, popular in premium beauty routines.', '29.90', 'Nuxe', 'Wellness', 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=1200&q=80'),
            'YR-2023' => self::item('Nuxe Rêve de Miel Hand and Nail Cream', 'Comforting hand cream suitable for checkout add-ons and gift bags.', '9.90', 'Nuxe', 'Wellness', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=80'),
            'YR-2024' => self::item('CeraVe Moisturising Lotion', 'Dermatology-inspired moisturiser for face and body with ceramides and hyaluronic acid.', '16.90', 'CeraVe', 'Skincare', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80'),
            'YR-2025' => self::item('CeraVe SA Smoothing Cleanser', 'Salicylic acid cleanser formulated to help smooth rough skin texture.', '15.90', 'CeraVe', 'Skincare', 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=1200&q=80'),
            'YR-2026' => self::item('Dyson Supersonic Nural Hair Dryer', 'High-end hair dryer used in luxury blow-dry stations for rapid controlled drying.', '499.00', 'Dyson', 'Tools', 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80'),
            'YR-2027' => self::item('ghd Gold Hair Straightener', 'Professional styling iron for sleek straight finishes and soft bends.', '249.00', 'ghd', 'Tools', 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=1200&q=80'),
            'YR-2028' => self::item('BaBylissPRO FXONE Lo-Pro Clipper', 'Professional clipper suitable for fades, outlines and barber detailing.', '189.00', 'BaBylissPRO', 'Tools', 'https://images.unsplash.com/photo-1595475884562-073c30d45670?auto=format&fit=crop&w=1200&q=80'),
            'YR-2029' => self::item('BaBylissPRO Diffuser Universal', 'Universal diffuser attachment for textured blow-drying and curl definition.', '19.90', 'BaBylissPRO', 'Accessory', 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?auto=format&fit=crop&w=1200&q=80'),
            'YR-2030' => self::item('FOREO KIWI Dermaplaning Tool', 'Beauty tool for glow-focused at-home routines and pre-makeup skin smoothing.', '89.00', 'FOREO', 'Tools', 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80'),
            'YR-2031' => self::item('Tangle Teezer The Ultimate Detangler Fine & Fragile', 'Soft-pin detangling brush adapted to fragile or lightened hair.', '18.00', 'Tangle Teezer', 'Accessory', 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?auto=format&fit=crop&w=1200&q=80'),
            'YR-2032' => self::item('Wet Brush Pro Flex Dry', 'Vent brush built to speed up drying and reduce snagging during styling.', '22.00', 'Wet Brush', 'Accessory', 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=1200&q=80'),
            'YR-2033' => self::item('RefectoCil Brow and Lash Tint No.3 Natural Brown', 'Professional tint often used for brow and lash definition services.', '11.50', 'RefectoCil', 'Color', 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80'),
            'YR-2034' => self::item('RefectoCil Oxidant 3% Cream', 'Developer cream paired with professional brow and lash tint services.', '8.90', 'RefectoCil', 'Color', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80'),
            'YR-2035' => self::item('Kérastase Coffret Elixir Ultime', 'Gift-ready premium routine built around shine care and a luxury salon retail experience.', '78.00', 'Kérastase', 'Gift', 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=1200&q=80'),
            'YR-2036' => self::item('Moroccanoil Body Collection Gift Set', 'Gift set combining scented body care with a premium wellness feel.', '54.00', 'Moroccanoil', 'Gift', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80'),
            'YR-2037' => self::item('Redken Max Hold Hairspray', 'Strong-hold spray for updos, event styling and long-lasting finishing work.', '24.50', 'Redken', 'Styling', 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80'),
            'YR-2038' => self::item('Davines This Is A Sea Salt Spray', 'Texturizing spray used for effortless movement and matte beach texture.', '30.00', 'Davines', 'Styling', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80'),
            'YR-2039' => self::item('Aveda Be Curly Advanced Curl Enhancer Cream', 'Curl-defining cream that helps shape waves and curls while controlling frizz.', '34.00', 'Aveda', 'Styling', 'https://images.unsplash.com/photo-1519415943484-9fa1873496d4?auto=format&fit=crop&w=1200&q=80'),
        ];
    }

    /**
     * @return array<int, array{name:string,description:string,price:string,brand:string,category:string,image:string}>
     */
    public static function sequentialProducts(): array
    {
        return array_values(self::productsBySku());
    }

    /**
     * @return array{name:string,description:string,price:string,brand:string,category:string,image:string}
     */
    private static function item(string $name, string $description, string $price, string $brand, string $category, string $image): array
    {
        return compact('name', 'description', 'price', 'brand', 'category', 'image');
    }
}
