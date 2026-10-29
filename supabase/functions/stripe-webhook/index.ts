/**
 * Einnote Cloud — Edge Function « stripe-webhook »
 *
 * Seule autorité qui écrit dans `engram.entitlements`. Elle vérifie la
 * signature Stripe (donc l'origine), puis accorde ou retire l'accès.
 *
 * Déploiement (JWT désactivé : Stripe n'envoie pas de JWT) :
 *   supabase functions deploy stripe-webhook --no-verify-jwt
 *
 * Secrets requis :
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET   whsec_… (donné par `stripe listen` ou le dashboard)
 *   SUPABASE_SERVICE_ROLE_KEY (fourni par défaut dans les Edge Functions)
 *
 * ⚠️ Non testée ici : nécessite un compte Stripe et le CLI `stripe` pour
 * rejouer un événement. La logique ci-dessous est volontairement minimale et
 * lisible — un webhook est un point où l'on veut pouvoir lire, pas deviner.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";

/* Le client Stripe est construit à la demande, jamais à l'import : une
   fonction déployée sans secret doit répondre proprement « non configuré »
   plutôt que de planter au démarrage (500 opaque, invisible dans les logs du
   paiement). */
let stripeClient: Stripe | null = null;
function stripe(): Stripe {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY absent");
  stripeClient ??= new Stripe(key, { apiVersion: "2024-06-20" });
  return stripeClient;
}

/** Service role : contourne la RLS, et c'est le seul rôle qui doit le faire. */
function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

Deno.serve(async (request) => {
  const signature = request.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!Deno.env.get("STRIPE_SECRET_KEY") || !secret) {
    return new Response("paiement non configuré sur ce serveur", { status: 503 });
  }

  if (!signature) {
    return new Response("signature manquante", { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = await stripe().webhooks.constructEventAsync(payload, signature, secret);
  } catch (error) {
    // Signature invalide = requête non authentique. On refuse.
    return new Response(`signature invalide: ${(error as Error).message}`, { status: 400 });
  }

  const write = (ownerId: string, values: Record<string, unknown>) =>
    admin()
      .schema("engram")
      .from("entitlements")
      .upsert(
        { owner_id: ownerId, ...values, updated_at: new Date().toISOString() },
        { onConflict: "owner_id" },
      );

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const ownerId = session.client_reference_id;
      if (ownerId) {
        await write(ownerId, {
          plan: "cloud",
          status: "active",
          stripe_customer_id: String(session.customer ?? ""),
          stripe_subscription_id: String(session.subscription ?? ""),
        });
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;
      const ownerId = subscription.metadata?.supabase_user_id;
      if (ownerId) {
        await write(ownerId, {
          plan: subscription.status === "active" || subscription.status === "trialing" ? "cloud" : "free",
          status: subscription.status,
          stripe_customer_id: String(subscription.customer ?? ""),
          stripe_subscription_id: subscription.id,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const ownerId = subscription.metadata?.supabase_user_id;
      if (ownerId) {
        // On ne supprime pas les données : on ferme l'accès. L'utilisateur
        // peut réactiver et retrouver son contenu intact.
        await write(ownerId, {
          plan: "free",
          status: "canceled",
          stripe_subscription_id: subscription.id,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = String(invoice.subscription ?? "");
      if (subscriptionId) {
        const subscription = await stripe().subscriptions.retrieve(subscriptionId);
        const ownerId = subscription.metadata?.supabase_user_id;
        if (ownerId) {
          await write(ownerId, { plan: "cloud", status: "past_due" });
        }
      }
      break;
    }

    default:
      // On répond 200 : un événement non traité ne doit pas être rejoué
      // indéfiniment par Stripe.
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
