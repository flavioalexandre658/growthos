import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

async function setupStripePlans() {
  console.log("Setting up Groware billing plans on Stripe...\n");

  const plans = [
    {
      name: "Groware Starter",
      slug: "starter",
      prices: [
        { currency: "brl", unitAmount: 4900, envKey: "STRIPE_PRICE_STARTER_BRL" },
        { currency: "usd", unitAmount: 900, envKey: "STRIPE_PRICE_STARTER_USD" },
      ],
    },
    {
      name: "Groware Pro",
      slug: "pro",
      prices: [
        { currency: "brl", unitAmount: 14900, envKey: "STRIPE_PRICE_PRO_BRL" },
        { currency: "usd", unitAmount: 2900, envKey: "STRIPE_PRICE_PRO_USD" },
      ],
    },
    {
      name: "Groware Scale",
      slug: "scale",
      prices: [
        { currency: "brl", unitAmount: 49900, envKey: "STRIPE_PRICE_SCALE_BRL" },
        { currency: "usd", unitAmount: 9900, envKey: "STRIPE_PRICE_SCALE_USD" },
      ],
    },
  ];

  const envVars: string[] = [];

  for (const plan of plans) {
    console.log(`Creating product: ${plan.name}`);

    const product = await stripe.products.create({
      name: plan.name,
      metadata: { groware_plan: plan.slug },
    });

    console.log(`  Product ID: ${product.id}`);

    for (const price of plan.prices) {
      const stripePrice = await stripe.prices.create({
        product: product.id,
        unit_amount: price.unitAmount,
        currency: price.currency,
        recurring: { interval: "month" },
        metadata: {
          groware_plan: plan.slug,
          currency: price.currency,
        },
      });

      console.log(`  Price (${price.currency.toUpperCase()}): ${stripePrice.id}`);
      envVars.push(`${price.envKey}=${stripePrice.id}`);
    }

    console.log("");
  }

  console.log("=== Add these to your .env file ===");
  for (const line of envVars) {
    console.log(line);
  }

  console.log("\n=== Done! ===");
}

setupStripePlans().catch(console.error);
