import { createClient } from '@supabase/supabase-js';

// Configuration de débogage
const DEBUG = true;

// Vérifier et logger les variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (DEBUG) {
  console.group('🔧 Configuration Supabase');
  console.log('URL:', supabaseUrl);
  console.log('Clé Anon:', supabaseAnonKey ? '***' + supabaseAnonKey.slice(-4) : 'Non définie');
  console.groupEnd();
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erreur: Les variables d\'environnement Supabase ne sont pas correctement configurées');
}

// Configuration de Supabase avec gestion d'erreur améliorée
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    debug: DEBUG
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'CRM-Bewide',
      'x-client-info': 'crm-bewide-web/1.0.0'
    }
  }
});

// Intercepteur pour logger toutes les requêtes
if (DEBUG) {
  // @ts-ignore
  const originalQuery = supabase.rpc.bind(supabase);
  // @ts-ignore
  supabase.rpc = async function (fn, params) {
    console.group(`📡 Appel RPC: ${fn}`);
    console.log('Paramètres:', params);
    try {
      const result = await originalQuery(fn, params);
      console.log('Réponse:', result);
      return result;
    } catch (error) {
      console.error('Erreur RPC:', error);
      throw error;
    } finally {
      console.groupEnd();
    }
  };
}

// Logger les changements d'état d'authentification
supabase.auth.onAuthStateChange((event, session) => {
  if (DEBUG) {
    console.group('🔐 État d\'authentification');
    console.log('Événement:', event);
    console.log('Session:', session);
    console.groupEnd();
  }
});

// Tester la connexion au démarrage
async function testConnection() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    if (DEBUG) {
      console.log('✅ Connecté à Supabase');
      console.log('Session utilisateur:', data.session?.user);
    }
    
    // Tester l'accès à la table clients
    const { data: testData, error: testError } = await supabase
      .from('clients')
      .select('count')
      .limit(1);
      
    if (testError) throw testError;
    
    if (DEBUG) {
      console.log('✅ Accès à la table clients réussi');
    }
    
  } catch (error: any) {
    console.error('❌ Erreur de connexion à Supabase:', error);
    
    // En mode développement, afficher plus de détails
    if (DEBUG) {
      console.group('🔍 Détails de l\'erreur');
      console.error('Message:', error.message);
      if ('stack' in error) {
        console.error('Stack:', error.stack);
      }
      console.groupEnd();
    }
  }
}

// Démarrer le test de connexion
if (typeof window !== 'undefined') {
  testConnection();
}

export { supabase };
