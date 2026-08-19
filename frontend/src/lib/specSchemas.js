export const CONDITIONS = ["New", "Like New", "Good", "Fair", "Used", "For Parts / Repair"];
export const FUNC_STATUS = ["Working", "Partially Working", "Not Working"];
const LOCK_STATUS = ["Off / Klè", "On / Lock"];

// Brand list per category — shown as a "Mak" select before the rest of the
// spec form. Picking a brand reveals that brand's specific fields (e.g. iCloud
// status for Apple, Google/FRP status for Android) in addition to the fields
// every device in that category shares (storage, RAM, condition, etc.).
export const BRANDS = {
  phone: ["Apple", "Samsung", "Huawei", "Xiaomi", "Tecno", "Infinix", "Itel", "Google", "OnePlus", "Lòt Mak"],
  laptop: ["Apple (MacBook)", "HP", "Dell", "Lenovo", "Asus", "Acer", "MSI", "Toshiba", "Lòt Mak"],
};

// ---------------- Phone ----------------
const PHONE_COMMON = [
  { key: "model", label: "Modèl", type: "text", placeholder: "Galaxy S23 / iPhone 15 Pro" },
  { key: "storage", label: "Storage", type: "select", options: ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB"] },
  { key: "ram", label: "RAM", type: "select", options: ["2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB"] },
  { key: "color", label: "Koulè", type: "text" },
  { key: "battery_health", label: "Kondisyon Batri (%)", type: "text", placeholder: "89%" },
  { key: "carrier", label: "Carrier", type: "text", placeholder: "Digicel / Natcom / Unlocked" },
  { key: "unlocked", label: "Unlocked Status", type: "select", options: ["Unlocked", "Locked"] },
  { key: "physical_condition", label: "Kondisyon Fizik", type: "text" },
  { key: "functional_condition", label: "Kondisyon Fonksyonèl", type: "select", options: FUNC_STATUS },
];

const PHONE_BRAND_FIELDS = {
  "Apple": [
    { key: "icloud_status", label: "Estati iCloud / Activation Lock", type: "select", options: LOCK_STATUS },
  ],
  "Samsung": [
    { key: "google_account_status", label: "Estati Kont Google (FRP)", type: "select", options: LOCK_STATUS },
  ],
  "Huawei": [
    { key: "huawei_id_status", label: "Estati Huawei ID", type: "select", options: LOCK_STATUS },
  ],
  "Xiaomi": [
    { key: "mi_account_status", label: "Estati Mi Account", type: "select", options: LOCK_STATUS },
    { key: "google_account_status", label: "Estati Kont Google (FRP)", type: "select", options: LOCK_STATUS },
  ],
  "Google": [
    { key: "google_account_status", label: "Estati Kont Google (FRP)", type: "select", options: LOCK_STATUS },
  ],
  "OnePlus": [
    { key: "google_account_status", label: "Estati Kont Google (FRP)", type: "select", options: LOCK_STATUS },
  ],
  "Tecno": [
    { key: "google_account_status", label: "Estati Kont Google (FRP)", type: "select", options: LOCK_STATUS },
  ],
  "Infinix": [
    { key: "google_account_status", label: "Estati Kont Google (FRP)", type: "select", options: LOCK_STATUS },
  ],
  "Itel": [
    { key: "google_account_status", label: "Estati Kont Google (FRP)", type: "select", options: LOCK_STATUS },
  ],
};

// ---------------- Laptop ----------------
const LAPTOP_COMMON = [
  { key: "model", label: "Modèl", type: "text", placeholder: "EliteBook 840 G7 / MacBook Pro 14" },
  { key: "processor", label: "Processor", type: "text", placeholder: "Intel Core i7 / Apple M3" },
  { key: "cpu_generation", label: "CPU Generation", type: "text", placeholder: "10th Gen" },
  { key: "ram", label: "RAM", type: "select", options: ["4GB", "8GB", "16GB", "32GB", "64GB"] },
  { key: "storage_type", label: "Storage Type", type: "select", options: ["SSD", "HDD", "SSD + HDD"] },
  { key: "storage_capacity", label: "Storage Capacity", type: "select", options: ["128GB", "256GB", "512GB", "1TB", "2TB"] },
  { key: "gpu", label: "GPU", type: "text" },
  { key: "screen_size", label: "Screen Size", type: "text", placeholder: '14"' },
  { key: "resolution", label: "Resolution", type: "text", placeholder: "1920x1080" },
  { key: "battery_condition", label: "Battery Condition", type: "text" },
  { key: "charger_included", label: "Charger Enkli", type: "select", options: ["Wi", "Non"] },
  { key: "functional_condition", label: "Kondisyon Fonksyonèl", type: "select", options: FUNC_STATUS },
];

const LAPTOP_BRAND_FIELDS = {
  "Apple (MacBook)": [
    { key: "os", label: "Operating System", type: "text", placeholder: "macOS Sonoma" },
    { key: "icloud_status", label: "Estati iCloud / Activation Lock", type: "select", options: LOCK_STATUS },
  ],
  "HP": [{ key: "os", label: "Operating System", type: "text", placeholder: "Windows 11" }],
  "Dell": [{ key: "os", label: "Operating System", type: "text", placeholder: "Windows 11" }],
  "Lenovo": [{ key: "os", label: "Operating System", type: "text", placeholder: "Windows 11" }],
  "Asus": [{ key: "os", label: "Operating System", type: "text", placeholder: "Windows 11" }],
  "Acer": [{ key: "os", label: "Operating System", type: "text", placeholder: "Windows 11" }],
  "MSI": [{ key: "os", label: "Operating System", type: "text", placeholder: "Windows 11" }],
  "Toshiba": [{ key: "os", label: "Operating System", type: "text", placeholder: "Windows 11" }],
};

// Categories that are not brand-conditional (Parts, Accessories, Tools) show
// fields conditional on the SUBCATEGORY instead — e.g. picking "Batteries"
// shows capacity/cycle fields, picking "Screens" shows panel-type fields.
// Sellers still don't need to touch anything outside what's relevant to what
// they're actually posting.
const PARTS_COMMON = [
  { key: "compatible_model", label: "Modèl Konpatib", type: "text", placeholder: "iPhone 12 / 12 Pro" },
  { key: "originality", label: "Orijinal / Konpatib", type: "select", options: ["Original", "OEM", "Compatible/Copy", "Used Original", "Refurbished"] },
  { key: "working_status", label: "Estati Fonksyonman", type: "select", options: FUNC_STATUS },
];

const PARTS_SUBCAT_FIELDS = {
  "iPhone Parts": [{ key: "part_number", label: "Part Number", type: "text" }],
  "Samsung Parts": [{ key: "part_number", label: "Part Number", type: "text" }],
  "Laptop Parts": [{ key: "part_number", label: "Part Number", type: "text" }],
  "Screens": [
    { key: "panel_type", label: "Tip Ekran", type: "select", options: ["OLED", "LCD", "Incell", "Touch Only", "Digitizer Only"] },
    { key: "touch_working", label: "Touch Fonksyone", type: "select", options: ["Wi", "Non"] },
  ],
  "Batteries": [
    { key: "capacity_mah", label: "Kapasite (mAh)", type: "text", placeholder: "3000mAh" },
    { key: "cycle_count", label: "Cycle Count", type: "text" },
    { key: "battery_health", label: "Sante Batri (%)", type: "text", placeholder: "89%" },
  ],
  "Charging Ports": [{ key: "port_type", label: "Tip Pò", type: "select", options: ["Lightning", "USB-C", "Micro USB", "MagSafe"] }],
  "Motherboards": [
    { key: "storage_capacity", label: "Estokaj Enkli", type: "select", options: ["Pa gen", "64GB", "128GB", "256GB", "512GB"] },
    { key: "icloud_status", label: "Estati iCloud (si Apple)", type: "select", options: LOCK_STATUS },
  ],
  "RAM": [{ key: "capacity", label: "Kapasite", type: "select", options: ["2GB", "4GB", "8GB", "16GB", "32GB"] }, { key: "ram_type", label: "Tip", type: "text", placeholder: "DDR4 / LPDDR4" }],
  "SSD": [{ key: "capacity", label: "Kapasite", type: "select", options: ["128GB", "256GB", "512GB", "1TB", "2TB"] }, { key: "interface", label: "Interface", type: "select", options: ["SATA", "NVMe M.2"] }],
  "HDD": [{ key: "capacity", label: "Kapasite", type: "select", options: ["250GB", "500GB", "1TB", "2TB"] }, { key: "rpm", label: "RPM", type: "text", placeholder: "5400 / 7200" }],
  "Keyboard": [{ key: "layout", label: "Layout", type: "text", placeholder: "US / AZERTY" }, { key: "backlit", label: "Backlit", type: "select", options: ["Wi", "Non"] }],
  "Trackpad": [],
  "Cameras": [{ key: "camera_position", label: "Pozisyon", type: "select", options: ["Fwontal", "Dèyè"] }],
  "Speakers": [],
  "Connectors": [],
  "IC / Chips": [{ key: "chip_number", label: "Referans Chip", type: "text" }],
  "Cables": [{ key: "cable_length", label: "Longè", type: "text", placeholder: "1m / 2m" }],
  "Other": [{ key: "brand", label: "Mak", type: "text" }],
};

const ACCESSORIES_COMMON = [
  { key: "brand", label: "Mak", type: "text" },
  { key: "compatibility", label: "Konpatibilite", type: "text", placeholder: "Universal / iPhone 15" },
  { key: "new_used", label: "Nèf / Itilize", type: "select", options: ["New", "Used"] },
];

const ACCESSORIES_SUBCAT_FIELDS = {
  "Chargers": [{ key: "wattage", label: "Wattaj", type: "text", placeholder: "20W / 65W" }, { key: "port_type", label: "Tip Pò", type: "select", options: ["USB-C", "Lightning", "Micro USB"] }],
  "USB Cables": [{ key: "cable_type", label: "Tip Kab", type: "select", options: ["USB-C", "Lightning", "Micro USB"] }, { key: "cable_length", label: "Longè", type: "text" }],
  "Earbuds": [{ key: "wireless", label: "San Fil", type: "select", options: ["Wi", "Non"] }],
  "Headphones": [{ key: "wireless", label: "San Fil", type: "select", options: ["Wi", "Non"] }],
  "Cases": [{ key: "case_material", label: "Materyèl", type: "text", placeholder: "Silicone / Leather" }],
  "Screen Protectors": [{ key: "protector_type", label: "Tip", type: "select", options: ["Tempered Glass", "Plastic Film", "Privacy"] }],
  "Power Banks": [{ key: "capacity_mah", label: "Kapasite (mAh)", type: "text", placeholder: "10000mAh" }],
  "Phone Holders": [],
  "Laptop Chargers": [{ key: "wattage", label: "Wattaj", type: "text", placeholder: "65W / 90W" }],
  "Mouse": [{ key: "wireless", label: "San Fil", type: "select", options: ["Wi", "Non"] }],
  "Keyboard": [{ key: "wireless", label: "San Fil", type: "select", options: ["Wi", "Non"] }],
  "USB Hubs": [{ key: "ports_count", label: "Kantite Pò", type: "text" }],
  "Adapters": [{ key: "adapter_type", label: "Tip", type: "text", placeholder: "USB-C to HDMI" }],
  "Smart Watches": [{ key: "compatible_os", label: "Konpatib Ak", type: "select", options: ["iOS", "Android", "Toude"] }],
  "Other": [],
};

const TOOLS_COMMON = [{ key: "brand", label: "Mak", type: "text" }];

const TOOLS_SUBCAT_FIELDS = {
  "Phone Repair Tools": [{ key: "kit_pieces", label: "Kantite Pyès Kit", type: "text" }],
  "Laptop Repair Tools": [{ key: "kit_pieces", label: "Kantite Pyès Kit", type: "text" }],
  "Soldering Equipment": [{ key: "power_watts", label: "Pisans (W)", type: "text" }],
  "Programmers": [{ key: "model_name", label: "Non Modèl", type: "text" }],
  "Multimeters": [{ key: "model_name", label: "Non Modèl", type: "text" }],
  "Screwdriver Kits": [{ key: "kit_pieces", label: "Kantite Pyès Kit", type: "text" }],
  "Power Supplies": [{ key: "voltage_range", label: "Voltaj", type: "text", placeholder: "0-30V" }],
  "Repair Stations": [{ key: "station_type", label: "Tip", type: "text", placeholder: "Hot Air + Soldering" }],
  "Other": [],
};

// Categories that are not brand-conditional keep their old static schema.
export const SPEC_SCHEMAS = {
  parts: PARTS_COMMON,
  accessories: ACCESSORIES_COMMON,
  tools: TOOLS_COMMON,
};

const SUBCAT_FIELD_MAP = {
  parts: PARTS_SUBCAT_FIELDS,
  accessories: ACCESSORIES_SUBCAT_FIELDS,
  tools: TOOLS_SUBCAT_FIELDS,
};

/**
 * Returns the field list to render for a given category type, plus (for
 * brand-conditional categories) the brand already chosen, or (for
 * subcategory-conditional categories) the subcategory already chosen.
 * For "phone"/"laptop" with no brand chosen yet, returns [] so the UI shows
 * only the "Mak" picker until the seller chooses one. For "parts" /
 * "accessories" / "tools", the common fields always show; subcategory-specific
 * fields are appended once a subcategory is picked.
 */
export function getSpecSchema(categoryType, brand, subcategory) {
  if (categoryType === "phone") {
    if (!brand) return [];
    return [...PHONE_COMMON, ...(PHONE_BRAND_FIELDS[brand] || [])];
  }
  if (categoryType === "laptop") {
    if (!brand) return [];
    return [...LAPTOP_COMMON, ...(LAPTOP_BRAND_FIELDS[brand] || [])];
  }
  const common = SPEC_SCHEMAS[categoryType];
  if (!common) return [];
  const subcatMap = SUBCAT_FIELD_MAP[categoryType] || {};
  return [...common, ...(subcatMap[subcategory] || [])];
}
