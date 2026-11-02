/**
 * Starter message catalogs. en/sw/fr shipped; Luganda (lg) seeds the
 * Uganda-first expansion — catalogs grow with the frontend workstream.
 */
export const LOCALE_MESSAGES: Record<string, Record<string, string>> = {
  en: {
    'app.name': 'Invendex',
    'auth.login': 'Login',
    'auth.register': 'Create account',
    'auth.logout': 'Logout',
    'common.success': 'Success',
    'common.error': 'Something went wrong',
    'inventory.title': 'Inventory',
    'purchaseOrders.title': 'Purchase orders'
  },
  sw: {
    'app.name': 'Invendex',
    'auth.login': 'Ingia',
    'auth.register': 'Fungua akaunti',
    'auth.logout': 'Toka',
    'common.success': 'Imefaulu',
    'common.error': 'Kuna tatizo',
    'inventory.title': 'Hisa',
    'purchaseOrders.title': 'Maagizo ya kununua'
  },
  fr: {
    'app.name': 'Invendex',
    'auth.login': 'Connexion',
    'auth.register': 'Créer un compte',
    'auth.logout': 'Déconnexion',
    'common.success': 'Succès',
    'common.error': "Une erreur s'est produite",
    'inventory.title': 'Inventaire',
    'purchaseOrders.title': 'Commandes fournisseurs'
  },
  lg: {
    'app.name': 'Invendex',
    'auth.login': 'Yingira',
    'auth.register': 'Tondawo akaawunti',
    'auth.logout': 'Fuluma',
    'common.success': 'Kikola',
    'common.error': 'Wabewo obuzibu',
    'inventory.title': 'Ebintu bya kkampuni',
    'purchaseOrders.title': 'Amagaagizo g’okugula'
  }
};
