export const CONDITIONS = ["New", "Like New", "Good", "Fair", "Used", "For Parts / Repair"];
export const FUNC_STATUS = ["Working", "Partially Working", "Not Working"];

// Category-specific spec field definitions (keyed by category.type)
export const SPEC_SCHEMAS = {
  phone: [
    { key: "model", label: "Modèl", type: "text", placeholder: "iPhone 13 Pro" },
    { key: "storage", label: "Storage", type: "select", options: ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB"] },
    { key: "color", label: "Koulè", type: "text" },
    { key: "battery_health", label: "Battery Health (%)", type: "text", placeholder: "89%" },
    { key: "carrier", label: "Carrier", type: "text", placeholder: "Digicel / Natcom / Unlocked" },
    { key: "unlocked", label: "Unlocked Status", type: "select", options: ["Unlocked", "Locked"] },
    { key: "activation_lock", label: "iCloud / Activation Lock", type: "select", options: ["Off / Clean", "On"] },
    { key: "physical_condition", label: "Kondisyon Fizik", type: "text" },
    { key: "functional_condition", label: "Kondisyon Fonksyonèl", type: "select", options: FUNC_STATUS },
  ],
  laptop: [
    { key: "model", label: "Modèl", type: "text", placeholder: "EliteBook 840 G7" },
    { key: "processor", label: "Processor", type: "text", placeholder: "Intel Core i7" },
    { key: "cpu_generation", label: "CPU Generation", type: "text", placeholder: "10th Gen" },
    { key: "ram", label: "RAM", type: "select", options: ["4GB", "8GB", "16GB", "32GB", "64GB"] },
    { key: "storage_type", label: "Storage Type", type: "select", options: ["SSD", "HDD", "SSD + HDD"] },
    { key: "storage_capacity", label: "Storage Capacity", type: "select", options: ["128GB", "256GB", "512GB", "1TB", "2TB"] },
    { key: "gpu", label: "GPU", type: "text" },
    { key: "screen_size", label: "Screen Size", type: "text", placeholder: '14"' },
    { key: "resolution", label: "Resolution", type: "text", placeholder: "1920x1080" },
    { key: "os", label: "Operating System", type: "text", placeholder: "Windows 11" },
    { key: "battery_condition", label: "Battery Condition", type: "text" },
    { key: "charger_included", label: "Charger Enkli", type: "select", options: ["Wi", "Non"] },
    { key: "functional_condition", label: "Kondisyon Fonksyonèl", type: "select", options: FUNC_STATUS },
  ],
  parts: [
    { key: "brand", label: "Mak", type: "text" },
    { key: "compatible_model", label: "Compatible Model", type: "text", placeholder: "iPhone 12 / 12 Pro" },
    { key: "part_number", label: "Part Number", type: "text" },
    { key: "originality", label: "Original / Compatible", type: "select", options: ["Original", "OEM", "Compatible", "Used Original", "Refurbished"] },
    { key: "working_status", label: "Working Status", type: "select", options: FUNC_STATUS },
  ],
  accessories: [
    { key: "brand", label: "Mak", type: "text" },
    { key: "model", label: "Modèl", type: "text" },
    { key: "compatibility", label: "Compatibility", type: "text", placeholder: "Universal / iPhone" },
    { key: "new_used", label: "New / Used", type: "select", options: ["New", "Used"] },
  ],
  tools: [
    { key: "brand", label: "Mak", type: "text" },
    { key: "model", label: "Modèl", type: "text" },
    { key: "specifications", label: "Specifications", type: "text" },
  ],
};
