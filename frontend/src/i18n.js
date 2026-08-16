export const translations = {
  ht: {
    // header / nav
    search: "Chèche", categories: "Kategori", sell: "Vann", messages: "Mesaj",
    notifications: "Notifikasyon", login: "Konekte", register: "Enskri", profile: "Pwofil",
    logout: "Dekonekte", home: "Akèy", favorites: "Favori", dashboard: "Tablo Vandè",
    admin: "Admin", myAccount: "Kont mwen",
    // hero
    heroTitle: "Jwenn sa w bezwen. Vann sa w pa bezwen.",
    heroSubtitle: "Telefòn, laptop, pyès, akseswa ak teknoloji disponib toupre ou ann Ayiti.",
    searchPlaceholder: "Chèche telefòn, laptop, pyès oswa akseswa…",
    sellProduct: "Vann yon pwodwi",
    // sections
    featured: "Pwodwi an Vedèt", recentlyAdded: "Dènye Ajoute", phonesNearYou: "Telefòn Toupre Ou",
    laptopsNearYou: "Laptop Toupre Ou", partsAccessories: "Pyès & Akseswa", verifiedSellers: "Vandè Verifye",
    howItWorks: "Kijan Li Mache", safetyTips: "Konsèy Sekirite", viewAll: "Wè Tout",
    browseCategories: "Gade Kategori yo", noProducts: "Poko gen pwodwi.",
    // product
    condition: "Kondisyon", location: "Kote", description: "Deskripsyon", specifications: "Karakteristik",
    seller: "Vandè", datePosted: "Dat pibliye", views: "Vizyalizasyon",
    contactSeller: "Kontakte Vandè", whatsapp: "WhatsApp", call: "Rele", sendMessage: "Voye Mesaj",
    addToFavorites: "Ajoute nan Favori", sold: "VANN", report: "Rapòte",
    // auth
    fullName: "Non Konplè", username: "Non Itilizatè", email: "Email", phone: "Telefòn",
    password: "Modpas", confirmPassword: "Konfime Modpas", country: "Peyi", department: "Depatman",
    city: "Vil / Komin", acceptTerms: "Mwen li epi mwen aksepte Terms & Conditions.",
    createAccount: "Kreye Kont", alreadyAccount: "Ou gen yon kont deja?",
    noAccount: "Ou pa gen kont?", forgotPassword: "Bliye modpas?", signIn: "Konekte",
    // misc
    price: "Pri", quantity: "Kantite", brand: "Mak", model: "Modèl", save: "Anrejistre",
    cancel: "Anile", submit: "Voye", loading: "Ap chaje...", all: "Tout",
    filters: "Filtè", sortBy: "Klase pa", clearFilters: "Efase filtè",
    becomeSeller: "Devni yon Vandè", newest: "Pi nouvo", oldest: "Pi ansyen",
    priceLow: "Pri: Ba an Wo", priceHigh: "Pri: Wo an Ba", mostViewed: "Plis Gade",
    mostPopular: "Pi Popilè", results: "rezilta", neighborhood: "Katye",
  },
  fr: {
    search: "Chercher", categories: "Catégories", sell: "Vendre", messages: "Messages",
    notifications: "Notifications", login: "Connexion", register: "S'inscrire", profile: "Profil",
    logout: "Déconnexion", home: "Accueil", favorites: "Favoris", dashboard: "Tableau Vendeur",
    admin: "Admin", myAccount: "Mon compte",
    heroTitle: "Trouvez ce qu'il vous faut. Vendez ce dont vous n'avez plus besoin.",
    heroSubtitle: "Téléphones, ordinateurs, pièces, accessoires et technologie près de vous en Haïti.",
    searchPlaceholder: "Chercher téléphone, ordinateur, pièces ou accessoires…",
    sellProduct: "Vendre un produit",
    featured: "Produits en Vedette", recentlyAdded: "Récemment Ajoutés", phonesNearYou: "Téléphones Près de Vous",
    laptopsNearYou: "Ordinateurs Près de Vous", partsAccessories: "Pièces & Accessoires", verifiedSellers: "Vendeurs Vérifiés",
    howItWorks: "Comment Ça Marche", safetyTips: "Conseils de Sécurité", viewAll: "Voir Tout",
    browseCategories: "Parcourir les Catégories", noProducts: "Aucun produit.",
    condition: "État", location: "Lieu", description: "Description", specifications: "Caractéristiques",
    seller: "Vendeur", datePosted: "Date de publication", views: "Vues",
    contactSeller: "Contacter le Vendeur", whatsapp: "WhatsApp", call: "Appeler", sendMessage: "Envoyer un Message",
    addToFavorites: "Ajouter aux Favoris", sold: "VENDU", report: "Signaler",
    fullName: "Nom Complet", username: "Nom d'utilisateur", email: "Email", phone: "Téléphone",
    password: "Mot de passe", confirmPassword: "Confirmer le mot de passe", country: "Pays", department: "Département",
    city: "Ville / Commune", acceptTerms: "J'ai lu et j'accepte les Termes & Conditions.",
    createAccount: "Créer un Compte", alreadyAccount: "Vous avez déjà un compte?",
    noAccount: "Pas de compte?", forgotPassword: "Mot de passe oublié?", signIn: "Se connecter",
    price: "Prix", quantity: "Quantité", brand: "Marque", model: "Modèle", save: "Enregistrer",
    cancel: "Annuler", submit: "Envoyer", loading: "Chargement...", all: "Tout",
    filters: "Filtres", sortBy: "Trier par", clearFilters: "Effacer les filtres",
    becomeSeller: "Devenir Vendeur", newest: "Plus récent", oldest: "Plus ancien",
    priceLow: "Prix: Croissant", priceHigh: "Prix: Décroissant", mostViewed: "Plus Vus",
    mostPopular: "Plus Populaires", results: "résultats", neighborhood: "Quartier",
  },
};

export function getCatName(cat, lang) {
  if (!cat) return "";
  return cat[`name_${lang}`] || cat.name_ht || cat.name_en || "";
}
