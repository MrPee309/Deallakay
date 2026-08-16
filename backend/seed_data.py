import uuid


def _sub(names):
    return [{"id": str(uuid.uuid4()), "name": n, "slug": n.lower().replace(" ", "-").replace("/", "")} for n in names]


CATEGORIES = [
    {
        "id": "cat-phones",
        "slug": "telefon",
        "name_ht": "Telefòn",
        "name_fr": "Téléphones",
        "name_en": "Phones",
        "icon": "smartphone",
        "type": "phone",
        "order": 1,
        "subcategories": _sub([
            "iPhone", "Samsung", "Google Pixel", "Tecno", "Infinix", "Xiaomi",
            "Motorola", "Huawei", "OnePlus", "Nokia", "TCL", "Other",
        ]),
    },
    {
        "id": "cat-laptops",
        "slug": "laptop-odinate",
        "name_ht": "Laptop & Òdinatè",
        "name_fr": "Ordinateurs",
        "name_en": "Laptops & Computers",
        "icon": "laptop",
        "type": "laptop",
        "order": 2,
        "subcategories": _sub([
            "MacBook", "Dell", "HP", "Lenovo", "Asus", "Acer",
            "Microsoft Surface", "Chromebook", "Desktop PC", "Gaming PC", "Other",
        ]),
    },
    {
        "id": "cat-parts",
        "slug": "pyes-components",
        "name_ht": "Pyès & Components",
        "name_fr": "Pièces & Composants",
        "name_en": "Parts & Components",
        "icon": "cpu",
        "type": "parts",
        "order": 3,
        "subcategories": _sub([
            "iPhone Parts", "Samsung Parts", "Laptop Parts", "Screens", "Batteries",
            "Charging Ports", "Motherboards", "RAM", "SSD", "HDD", "Keyboard",
            "Trackpad", "Cameras", "Speakers", "Connectors", "IC / Chips", "Cables", "Other",
        ]),
    },
    {
        "id": "cat-accessories",
        "slug": "akseswa",
        "name_ht": "Akseswa",
        "name_fr": "Accessoires",
        "name_en": "Accessories",
        "icon": "headphones",
        "type": "accessories",
        "order": 4,
        "subcategories": _sub([
            "Chargers", "USB Cables", "Earbuds", "Headphones", "Cases", "Screen Protectors",
            "Power Banks", "Phone Holders", "Laptop Chargers", "Mouse", "Keyboard",
            "USB Hubs", "Adapters", "Smart Watches", "Other",
        ]),
    },
    {
        "id": "cat-tools",
        "slug": "ekipman-teknoloji",
        "name_ht": "Ekipman Teknoloji",
        "name_fr": "Équipement Tech",
        "name_en": "Tools / Equipment",
        "icon": "wrench",
        "type": "tools",
        "order": 5,
        "subcategories": _sub([
            "Phone Repair Tools", "Laptop Repair Tools", "Soldering Equipment", "Programmers",
            "Multimeters", "Screwdriver Kits", "Power Supplies", "Repair Stations", "Other",
        ]),
    },
]


DEPARTMENTS = [
    {"id": "dep-ouest", "name": "Ouest", "cities": ["Port-au-Prince", "Delmas", "Pétion-Ville", "Carrefour", "Croix-des-Bouquets", "Tabarre", "Kenscoff", "Gressier", "Léogâne"]},
    {"id": "dep-nord", "name": "Nord", "cities": ["Cap-Haïtien", "Limbé", "Grande-Rivière-du-Nord", "Plaine-du-Nord", "Milot", "Quartier-Morin"]},
    {"id": "dep-nord-est", "name": "Nord-Est", "cities": ["Fort-Liberté", "Ouanaminthe", "Trou-du-Nord", "Terrier-Rouge"]},
    {"id": "dep-nord-ouest", "name": "Nord-Ouest", "cities": ["Port-de-Paix", "Saint-Louis-du-Nord", "Môle-Saint-Nicolas", "Jean-Rabel"]},
    {"id": "dep-artibonite", "name": "Artibonite", "cities": ["Gonaïves", "Saint-Marc", "Verrettes", "Dessalines", "Gros-Morne"]},
    {"id": "dep-centre", "name": "Centre", "cities": ["Hinche", "Mirebalais", "Lascahobas", "Belladère"]},
    {"id": "dep-sud", "name": "Sud", "cities": ["Les Cayes", "Aquin", "Port-Salut", "Camp-Perrin", "Chantal"]},
    {"id": "dep-sud-est", "name": "Sud-Est", "cities": ["Jacmel", "Marigot", "Bainet", "Cayes-Jacmel"]},
    {"id": "dep-nippes", "name": "Nippes", "cities": ["Miragoâne", "Anse-à-Veau", "Petit-Trou-de-Nippes", "Baradères"]},
    {"id": "dep-grandanse", "name": "Grand'Anse", "cities": ["Jérémie", "Dame-Marie", "Anse-d'Hainault", "Corail"]},
]


DEFAULT_SETTINGS = {
    "id": "site-settings",
    "site_branding": {
        "siteName": "DealLakay",
        "siteTagline": "Achte. Vann. Fè bon Deal.",
        "logo": "",
        "favicon": "",
        "primaryColor": "#0047FF",
        "secondaryColor": "#FFC800",
        "currency": "HTG",
        "defaultLanguage": "ht",
    },
    "listing_mode": "auto",  # "auto" or "approval"
    "safety_messages": [
        "Pa voye lajan davans bay moun ou pa konnen.",
        "Verifye telefòn nan avan ou peye.",
        "Verifye IMEI.",
        "Verifye iCloud / Activation Lock.",
        "Teste laptop la avan ou peye.",
        "Rankontre nan yon kote ki an sekirite.",
    ],
}
