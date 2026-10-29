/**
 * Einnote Cloud — Edge Function « stripe-checkout »
 *
 * Crée une session Stripe Checkout pour l'abonnement à 10 $/mois et renvoie
 * l'URL de paiement. L'utilisateur est identifié par son JWT Supabase.
 *
 * Déploiement :
 *   supabase functions deploy stripe-checkout
 *
 * Secrets requis :
 *   STRIPE_SECRET_KEY      sk_live_… / sk_test_…
 *   STRIPE_PRICE_ID        price_… (10 $ / mois, récurrent)
 *   APP_URL                https://votre-domaine (retour après paiement)
 *
 * ⚠️ Non testée ici : sans compte Stripe, aucun appel réel n'a été fait.
 * Le contrat d'entrée/sortie est ci-dessous et ne dépend pas de Stripe pour
 * être relu.
 *
 * Entrée : POST {} avec en-tête Authorization: Bearer <jwt Supabase>
 * Sortie : { url: "https://checkout.stripe.com/…" } ou { error }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const auth = request.headers.get("Authorization");
  if (!auth) {
    return json({ error: "Authentification requise." }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return json({ error: "Session invalide." }, 401);
  }

  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  const price = Deno.env.get("STRIPE_PRICE_ID");
  const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:5173";

  if (!secret || !price) {
    return json(
      { error: "Paiement non configuré sur ce serveur (STRIPE_SECRET_KEY / STRIPE_PRICE_ID)." },
      503,
    );
  }

  const stripe = new Stripe(secret, { apiVersion: "2024-06-20" });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      line_items: [{ price, quantity: 1 }],
      // Le webhook relie le paiement au compte : c'est cette métadonnée qui
      // fait foi, jamais le retour navigateur (falsifiable).
      client_reference_id: user.id,
      subscription_data: { metadata: { supabase_user_id: user.id } },
      success_url: `${appUrl}/settings/cloud?checkout=success`,
      cancel_url: `${appUrl}/settings/cloud?checkout=cancel`,
    });

    return json({ url: session.url });
  } catch (error) {
    return json({ error: String((error as Error).message ?? error) }, 502);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
