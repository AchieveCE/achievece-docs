---
title: How plan upgrades work
slug: plan-upgrades
groups: [admin, marketing, customer-service, payments, engineering]
category: Billing
summary: What happens when a customer upgrades their plan, what we charge them, and what each team can see and do
updated: 2026-05-27
---

# How plan upgrades work

When a customer moves from a cheaper AchieveCE plan to a more expensive one, this is what the system does about it: how we price the change, what we charge the card on file, what we keep on record, and what happens to the customer's renewal date. No back-office step is involved; once the customer confirms, the rest runs on its own. This guide is for support, marketing, and admin. Engineering should be able to read it and confirm it's accurate.

If you read nothing else, read section 3 (what the customer pays) and section 6 (undoing a downgrade for free). Section 3 is what support gets asked about most often. Section 6 is the second most common upgrade ticket.

---

## 1. The problem we're solving

A customer on a cheaper AchieveCE plan who wants more has three options. They can wait until their current plan renews and switch then. They can cancel today and start a fresh subscription at the higher tier, which double-charges them and loses the time they already paid for. Or they can upgrade.

The upgrade exists so the third option is the obvious choice. For that to be the case, four things have to be true.

<div class="comparison">
  <div class="comparison-card">
    <div class="comparison-card-header">Fair price</div>
    <p style="margin:0">The customer pays only for the difference, scaled to the time left in their cycle. Never below $0.</p>
  </div>
  <div class="comparison-card">
    <div class="comparison-card-header">Instant access</div>
    <p style="margin:0">Click, charge, swap, toast. The new plan is live the same second.</p>
  </div>
  <div class="comparison-card">
    <div class="comparison-card-header">No churn</div>
    <p style="margin:0">It's the same subscription on Stripe before and after. We don't cancel and recreate.</p>
  </div>
  <div class="comparison-card">
    <div class="comparison-card-header">Honest receipt</div>
    <p style="margin:0">A permanent record of every plan change, so support can answer "did this happen and what did we charge" without guesswork.</p>
  </div>
</div>

The rest of this guide walks through how those four guarantees work in practice.

---

## 2. What an upgrade looks like

Picture a customer named Diana. She signed up for AchieveCE Lite four months ago at $29 for the year. She's most of the way through a course series and wants the extra content that ships with Advanced ($99 for the year).

Here is her upgrade from the moment she opens her dashboard.

- She lands on her dashboard. The "Manage plan" link in her sidebar takes her to the plan comparison page at `/dashboard/manage-plan`.
- The page shows her current plan and the higher tiers above it, each with a prominent "Upgrade" button. She picks Advanced.
- A breakdown modal opens. It shows three lines: the cost of Advanced prorated for the time remaining in her cycle, the credit she gets for the unused part of Lite, and the resulting charge. For Diana that's $38.36 today.
- She confirms. Within about two seconds the page updates. A toast reads "Upgraded to Advanced - $38.36 charged." Her Advanced-only courses appear in her library.
- Her Stripe receipt arrives by email a moment later showing the $38.36 charge against her existing subscription. Her next renewal, 200 days from now, will be the full $99.

That's the entire upgrade from Diana's point of view: one click, one charge, no waiting.

Behind the scenes, the system runs five quick steps in order: check that the upgrade is allowed, work out the price, charge Stripe, update our own records, and send follow-up notifications. The record updates happen together as one block; if anything in that block fails, the whole thing is undone. Engineering: the orchestrator lives at `src/features/plan-management/services/plan-transition.service.ts` in the `achievece-web` repo.

---

## 3. What the customer pays

This is the section support gets asked about most often. The pricing has one rule:

> The customer pays for the remaining time on the new plan, minus a credit for the remaining time they already paid for on the old plan. They never pay below $0.

Time-based only. Purchase credits, promo codes, gift cards, and any other balance on the account are not factored in. The result is rounded to cents and floored at $0.

For engineering, the exact formula as it runs in code:

```
billingRatio  = remainingDays / totalBillingDays
proratedCost  = billingRatio * newPlanPrice
unusedCredit  = billingRatio * currentPlanPrice
upgradePrice  = max(proratedCost - unusedCredit, 0)
```

### Diana's numbers, walked through

Diana is 165 days into her one-year Lite subscription. There are 200 days remaining out of 365.

| Step | Value |
| --- | --- |
| Days left in her cycle | 200 |
| Length of her cycle | 365 |
| Fraction remaining | 200 / 365 = 0.5479 |
| Advanced annual price | $99.00 |
| Lite annual price | $29.00 |
| Prorated cost of Advanced | 0.5479 × $99 = $54.25 |
| Credit for her unused Lite time | 0.5479 × $29 = $15.89 |
| What Diana pays today | $54.25 - $15.89 = **$38.36** |

That $38.36 is what Diana sees in the breakdown modal before she confirms, and what gets charged to her card.

### What she sees, on screen

The breakdown modal renders directly off these numbers. The layout is roughly:

```
+----------------------------------------------------+
| Upgrade to Advanced                                |
| ------------------------------------------------   |
| Advanced, prorated for 200 days        $54.25      |
| Credit for unused Lite time           -$15.89      |
| ------------------------------------------------   |
| Charged today                          $38.36      |
|                                                    |
| Your next renewal on Dec 12 will be $99.00,        |
| the full Advanced annual price.                    |
|                                                    |
|     [ Confirm upgrade ]    Cancel                  |
+----------------------------------------------------+
```

If the math comes out to zero or negative (which happens for the free re-upgrade case in section 6), the "Charged today" line swaps to "No charge today" and the Confirm button copy changes to match.

---

## 4. What counts as an upgrade

"Upgrade" here has a strict meaning: the target plan has to cost more than the current one. The system enforces this with two checks.

| Condition | Result |
| --- | --- |
| The customer is already on the plan they picked | Rejected with "You are already on this plan" |
| The target plan costs the same or less than what they have today | Rejected with "Target plan is not an upgrade. Use the downgrade flow instead." |

A customer almost never sees those errors, because the UI only shows an "Upgrade" button on plans priced above the current one. Plans priced below show "Downgrade" instead, and equal-price plans show no CTA at all.

This matters for support because every so often a customer asks why their button says "Downgrade" when they're trying to switch plans. The answer is that the target plan costs less than what they have today; they want the downgrade flow, not the upgrade flow.

---

## 5. Same subscription, before and after

When Diana upgrades, the system does **not** cancel her existing Stripe subscription and create a new one. It changes what's on the existing subscription. The Stripe subscription ID she had as a Lite customer is the same Stripe subscription ID she has as an Advanced customer.

This is useful in three different places.

| Reader | Why it matters |
| --- | --- |
| Finance | The recurring-revenue report doesn't see a cancellation plus a new subscription. It sees a price change on an existing subscription. Churn metrics stay clean. |
| Support | When a customer asks "is this a new subscription," the answer is no. Same Stripe invoice history, same start date, same record on our side. |
| Engineering | The Stripe subscription ID is never touched by the upgrade path. Anything keyed off that ID stays valid. |

For engineers who want the detail: we issue a one-off Stripe invoice for the prorated upgrade amount, finalize and pay it immediately, then update the existing subscription to the new product price. We turn Stripe's own proration off (`proration_behavior: "none"`) because the pricing has already been settled on the side invoice. Our formula is the only source of pricing truth.

---

## 6. Undoing a downgrade for free

Second most common upgrade-related support ticket.

A customer on Advanced downgrades to Lite mid-cycle. The system honors that downgrade by scheduling Lite to start at the end of the current billing period, not immediately. The customer keeps Advanced access until the period they already paid for ends. While that's pending, we remember what plan they were originally on and when the period ends.

Sometimes a customer changes their mind before that period ends. They want Advanced to keep going past the cutoff, without paying anything new. They already paid for Advanced through the end of the cycle, nothing has been refunded, and the swap-down hasn't happened yet. The fair answer is to undo the downgrade for $0.

For that to work, all four of these have to be true.

| Required for a free re-upgrade |
| --- |
| The customer has a pending downgrade on their account |
| We know what plan they were originally on |
| We know when their current billing period ends |
| Today is still before that end date |

If all four are true, the customer can re-upgrade to any plan priced at or below what they originally paid, at $0. Diana, after downgrading from Advanced ($99) to Lite mid-cycle, could re-upgrade back to Advanced any time before her current period ends. She could not free re-upgrade to Pro ($149); she never paid for Pro, so a move to Pro would fall through to the regular paid upgrade flow.

Differences from a paid upgrade:

| Step | Paid upgrade | Free re-upgrade |
| --- | --- | --- |
| Stripe charge | The prorated amount | Nothing, no charge created |
| Payment record on our side | Created | None |
| Stripe invoice | Created and paid | Skipped |
| Subscription updated to new plan | Yes | Yes |
| Plan-change record | Tagged "upgrade" | Tagged "free re-upgrade" |
| Old downgrade tracking | Always cleared | Cleared only when the target equals what they originally paid for |

If a customer ever calls and asks whether they really got their Advanced access back for free, support can look up their plan-change record (section 7) and read the answer off it.

---

## 7. Every plan change is recorded

Every upgrade, downgrade, and free re-upgrade creates a permanent record. Each record captures who changed plans, from what to what, when, and how much they were charged. Nothing in the upgrade path ever rewrites or deletes a record once it's written.

This is mostly for support. The most common use is the question "did this customer upgrade, when, and how much did we charge them?" There is a single source of truth for that answer, and it doesn't require cross-referencing Stripe invoices or anywhere else.

It's also useful for anyone building reports about plan movement (finance, marketing, leadership). Because the records are never edited, the same query run a year from now will give the same answer as the same query run today.

For engineering: the table is called `plan_transitions` and is append-only by convention. If a record is wrong, write a corrective transition (an inverse upgrade, for example) rather than rewriting history. The schema in the repo is the source of truth on the exact columns.

---

## 8. The events we fire

Every time a plan changes or money changes hands, we send an event to both Brevo (for emails and audiences) and GA4 (for analytics and reporting). The event name is the same on both surfaces. Five of them are tied to plans and purchases.

| Event | Fires when |
| --- | --- |
| `upgrade_completed` | A customer moves to a higher-priced plan. |
| `downgrade_completed` | A customer moves to a lower-priced plan. No charge. |
| `free_reupgrade_completed` | A customer re-upgrades for $0 inside the billing period after a downgrade (section 6). |
| `subscription_purchase` | A customer buys a brand-new subscription at checkout. Not an upgrade (see below). |
| `single_payment_purchase` | A customer buys a one-off course or webinar at checkout. No subscription involved. |

All five go to both Brevo and GA4. The app fires other events too (newsletter sign-ups, upsell offers, the first-purchase discount form), but those are outside this guide; here we only cover the plan and purchase events.

### Two ways to upgrade, one event

A customer can reach a higher plan two different ways, and both fire `upgrade_completed`:

- From the **Manage plan** page in the app (section 10). The event carries `source: "plan_management"`.
- Through the **checkout cart**, when an upgrade is sitting in their cart at checkout. The event carries `source: "checkout"`.

The `source` field is how you tell them apart. The important takeaway for anyone segmenting on these events: a checkout upgrade does **not** fire `subscription_purchase`. The system spots the upgrade in the cart, runs the upgrade, and stops there. So `subscription_purchase` always means a brand-new subscriber, never someone moving up from a plan they already had. (If you've seen an older events table that listed `subscription_purchase` as covering "cart-driven upgrades," that's out of date. Upgrades fire `upgrade_completed` no matter where they start.)

### They run in the background

Every one of these events is sent fire-and-forget. If Brevo or GA4 has a hiccup, the customer's upgrade or purchase still goes through; the failed event is logged and we move on. That means analytics can briefly lag the source-of-truth plan-change record (section 7) during an outage.

### Who owns what

Engineering decides when each event fires and what fields it carries. Marketing decides what happens after it lands: the Brevo template list and the GA4 audience definitions live in those platforms, not in our code. A few practical takeaways for marketing:

- A Brevo audience of "everyone who has ever upgraded" is a one-line filter on `upgrade_completed`. No engineering ask needed.
- To send a "welcome to your new plan" email, attach it to `upgrade_completed` in Brevo.
- To tell an in-app upgrade apart from a checkout upgrade, filter on the `source` field.
- Need a brand-new field on an event (a campaign code, say)? That is an engineering ask. The event names themselves don't need to grow.

### The fields each event carries

For engineering, and for marketing building audiences that key off a specific field. Every event also carries `currency`, which is always USD today.

| Event | Fields |
| --- | --- |
| `upgrade_completed` | `subscription_id`, `from_product_id`, `from_plan_name`, `from_price`, `to_product_id`, `to_plan_name`, `to_price`, `product_type`, `amount_charged`, `source` |
| `downgrade_completed` | the same `from` and `to` fields, minus `amount_charged`, plus `free_reupgrade_until` (when the free re-upgrade window closes) |
| `free_reupgrade_completed` | the `from` and `to` fields, plus `originally_paid_product_id`, `originally_paid_plan_name`, `originally_paid_price`, `reached_original_tier`, `billing_period_end`, `source` |
| `subscription_purchase` | `cart_id`, `product_name`, `product_id`, `product_type`, `amount`, `renewal_interval`. Fires once per subscription in the cart. |
| `single_payment_purchase` | `cart_id`, `product_names`, `product_count`, `amount`. One event covering all the one-off items in the cart. |

GA4 receives a trimmed version of each (the IDs, the dollar value, the product type, and `source`) so funnel and revenue reports work without extra setup.

---

## 9. Common questions from customers

### "I upgraded but my new plan's benefits aren't showing."

Most common upgrade ticket. Two things to check:

1. Did the upgrade actually go through? Pull up the customer's plan-change history (section 7). If the most recent entry is an upgrade with a recent timestamp, the upgrade happened on our side.
2. If it did, the customer is probably looking at a cached page. Tell them to refresh. The dashboard updates itself on success, but a stale tab they had open in another window won't.

If the change history shows nothing recent but Stripe shows a charge for the upgrade amount, escalate to engineering. That is a mismatch between Stripe and our records and someone needs to reconcile it by hand.

### "I was charged more (or less) than I expected."

The breakdown modal showed the customer an exact number before they confirmed. The card was charged that exact number. Almost always the customer's expectation came from somewhere else, often "I'll pay the difference between the two annual prices," forgetting that the difference scales with how much time is left in the cycle. Walk them through section 3 with their own dates and prices.

If the customer is convinced the modal said one number and the charge was different, ask for their Stripe receipt and compare to what we recorded for that change. The two should match exactly. If they don't, escalate.

### "I just downgraded and I want to undo it."

If the customer is still inside their current billing period, they can re-upgrade for $0. Send them to the same Manage plan page; the Upgrade button will be there. If you want to double-check before sending them, run through the eligibility list in section 6.

If they're already past the end of that period, the downgrade has fully taken effect and they need to pay the proration to go back up. That is a regular paid upgrade and the breakdown modal will show them the price before they confirm.

### "Was I charged for a full month?"

No. The customer pays only for the remaining time in the current cycle, on the new plan, minus credit for the remaining time on the old plan. Section 3 walks through the formula with Diana's numbers.

### "Will my next renewal still be on the same date?"

Yes, in almost every case. The upgrade doesn't extend or shorten the cycle; it just changes what the customer is paying for. The date stays the same. The amount of the next charge changes to the new plan's full price.

### "Is this a new subscription?"

No. Same Stripe subscription, same record on our side, same history. Only the price and the product changed. See section 5.

---

## 10. Where customers actually upgrade

The canonical surface is **Dashboard → Manage plan**, at `/dashboard/manage-plan`. That page shows one card per tier above the customer's current plan, each with an "Upgrade" button.

A separate banner sometimes appears elsewhere on the dashboard prompting the customer to upgrade, or pointing out an active free re-upgrade window. The banner is a shortcut; the actual upgrade always happens on the Manage plan page. For the free re-upgrade case it looks roughly like this:

```
+----------------------------------------------------+
| Free re-upgrade available                          |
|                                                    |
| You downgraded to Lite, but you're still inside    |
| your Advanced billing period until Dec 12.         |
| Go back to Advanced now for $0.                    |
|                                                    |
|     [ Re-upgrade to Advanced ]                     |
+----------------------------------------------------+
```

If a customer is asking how to upgrade and they can't find the page, point them to `/dashboard/manage-plan`. Do not try to upgrade them yourself from an admin tool. The flow is customer-initiated by design; we want them confirming the breakdown modal themselves, not us guessing at what they meant.

---

## 11. Glossary

| Term | What it means here |
| --- | --- |
| **Upgrade** | A plan change where the new plan costs more than the current one. Equal-price or cheaper moves are not upgrades and use a different flow. |
| **Proration** | The time-based pricing we use for partial billing periods. Pay for the days left on the new plan, minus credit for the same days you already paid for on the old plan. |
| **Free re-upgrade** | A way to back out of a recent downgrade for $0, as long as the customer is still inside the billing period they already paid for. |
| **Plan-change record** | A permanent log entry written every time someone upgrades, downgrades, or free re-upgrades. The single source of truth for support questions about plan history. |
| **Zero-churn upgrade** | Upgrading without canceling the existing Stripe subscription. The subscription ID stays the same; only what's on it changes. |
| **Billing cycle** | The period the customer has paid for, between two consecutive renewals. The proration math is relative to the current cycle. |
| **Next renewal date** | The date Stripe will next attempt a full renewal charge. Doesn't change with an upgrade; only the amount does. |
| **Brevo** | The email and audience platform we use. Receives the `upgrade_completed` event. Same platform described in [How payment recovery works](payment-recovery.md). |
| **GA4** | Google Analytics 4. Receives the same `upgrade_completed` event. |
| **Northpass** | The course-hosting platform. Refreshes a customer's course enrollment when the membership type changes on an upgrade. Runs in the background; doesn't block the upgrade. |

---

If anything in this guide is wrong, outdated, or unclear, file an issue in the achievece-docs repository or ping the team. This document is meant to stay accurate, and the fastest way to keep it that way is to flag problems early.
