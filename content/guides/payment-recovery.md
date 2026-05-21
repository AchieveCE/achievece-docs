---
title: How payment recovery works
slug: payment-recovery
groups: [admin, marketing, customer-service, payments, engineering]
category: Billing
summary: What happens when a customer's payment fails, the emails we send to win them back, and how marketing can use the resulting data
updated: 2026-05-21
---

# How payment recovery works

When a customer's credit card gets declined at renewal time, this is what AchieveCE does about it. The system runs entirely on its own, every day, with no manual steps. This guide explains what's happening behind the curtain so you can answer questions from customers, build campaigns off the data it generates, and know which lever to pull when something looks off.

If you read nothing else, read section 1 (the problem) and section 4 (the four contact lists). Those are the parts marketing and support need most often.

---

## 1. The problem we're solving

About one in five subscription charges at AchieveCE used to fail. That's roughly twice the SaaS average, mostly because our customer base skews toward debit cards with tight balances. The failure rate itself is hard to move because it's a feature of the audience, but what comes after the failure was something we controlled, and we were doing nothing.

Here's what changed.

| Metric | Before | Where it should be | Why we're below |
| --- | --- | --- | --- |
| Charge failure rate | 21 percent | 5 to 10 percent | Audience mix, not a tech problem |
| Recovery rate (failed charges that eventually succeed) | 14 percent | 25 to 40 percent | We weren't talking to customers when their card failed |
| Customer awareness when their card failed | Zero | Same-day notification | No emails, no in-app warning |
| Time to cancel a stuck subscription | Forever (it just stayed broken) | Controlled, after a grace period | No cleanup happened |

The payment recovery system is the layer that fills every gap in that table.

---

## 2. What happens, in plain English

Picture a customer named Sarah. Her debit card auto-charges on the 15th of each month for her AchieveCE Premium subscription. This month her balance was low and the charge failed.

Here's her week.

```
Day 0  (morning)  Charge fails at Stripe.
                  Within about a minute:
                    Sarah gets an email titled
                    "We could not process your payment"
                    A banner shows up on her AchieveCE dashboard
                    Marketing's "In dunning" Brevo list adds her
                    Customer support gets pinged in Slack

Day 2-3           Stripe quietly retries the card. It fails again.
                  Sarah gets the second email:
                    "Quick reminder, your payment needs attention"

Day 4-5           Stripe retries again. Fails again.
                  Sarah gets the third email:
                    "Your access is at risk"

Day 6-7           Stripe retries one last time. Fails again.
                  Sarah gets the last email:
                    "Final notice, access pauses tomorrow"

Day 8             Either Sarah's payday came through (Stripe quietly
                  succeeds on a retry, no email needed yet)
                  OR she clicked the link in any of the emails and
                  updated her card
                  OR neither happened, and her access is paused

If she recovered, she gets a "Your payment is back on track" email
and the banner disappears.

If she didn't, her subscription is canceled and she gets a
"Your subscription has been paused" email.
```

That's the entire flow. Sarah experiences it as roughly four touchpoints over a week, all explaining the same thing in slightly more direct language each time. From our side, every step is automated, logged, and queryable.

---

## 3. The journey, as a flow chart

This is the same story as above, but as a single diagram for anyone who reads visually.

```
                       Customer renewal date
                              |
                              v
                  +---------------------------+
                  |   Stripe charges card     |
                  +---------------------------+
                       |                |
                  Success            Failure
                       |                |
                       v                v
                  Renewal done    +---------------------------+
                  Nothing else    | First failure detected    |
                                  | We classify the failure   |
                                  | (hard or soft, see s. 5)  |
                                  | We mark the subscription  |
                                  | as "past due"             |
                                  +---------------------------+
                                            |
                              +-------------+-------------+
                              |                           |
                              v                           v
                       Customer receives           Customer sees a banner
                       email "We could not         on the AchieveCE
                       process your payment"       dashboard, with a
                                                   button to fix the card
                              |                           |
                              +-------------+-------------+
                                            |
                                            v
                            +-----------------------------+
                            | Stripe retries the card     |
                            | over the next 7 days        |
                            +-----------------------------+
                                            |
                +---------------------------+---------------------------+
                |                                                       |
              Recovers                                          Never recovers
                |                                                       |
                v                                                       v
    +----------------------+                              +----------------------+
    | "Your payment is     |                              | We cancel the        |
    | back on track" email |                              | subscription at      |
    | Banner disappears    |                              | Stripe. Customer     |
    | Lists updated:       |                              | gets "Subscription   |
    | added to Recovered,  |                              | paused" email.       |
    | removed from In      |                              | Lists updated:       |
    | dunning              |                              | added to Access      |
    +----------------------+                              | revoked, removed     |
                                                          | from In dunning      |
                                                          +----------------------+
```

---

## 4. The four marketing lists

This is the part most useful to marketing day to day.

Every time something happens to a customer (card fails, payment recovers, access is paused, card is about to expire), we add or remove them from one of four contact lists inside Brevo. You can use these lists as audiences for Brevo email campaigns or sync them to Meta and Google as custom audiences for ads.

| List | Who's on it | What it's for | Stays forever? |
| --- | --- | --- | --- |
| **In dunning** | Customers whose card is failing right now | Retargeting ads with "Fix your card in 30 seconds" creative. Support outreach for high-value accounts. | No, they leave when their payment recovers or their access is revoked |
| **Card expiring soon** | Customers whose card on file expires before their next renewal | Soft retargeting, "Heads up, your card expires in a few weeks" tone. Lower urgency than dunning. | No, removed 30 days after the warning |
| **Recovered** | Customers who have ever successfully recovered from a failed payment | Lookalike audience seed for prospecting ads (these are proven resilient payers). Retention messaging like "Thanks for sticking with us." | Yes, permanent |
| **Access revoked** | Customers who have ever lost access via a payment failure | Win-back ad campaigns ("Come back to AchieveCE, here's 20 percent off"). Exclusion list for new-customer acquisition campaigns. | Yes, permanent |

The two permanent lists exist on purpose. Ad platforms build their best lookalike audiences from large historical populations, not rolling-window slices. If marketing ever needs a fresh-only view (just users who recovered in the last 90 days, for example), engineering can pull that with one query.

### How the lists stay correct

Two things keep these lists honest:

1. **Real-time updates.** The moment a customer's state changes, our code adds or removes them from the right list. Usually it happens within a few seconds.
2. **Daily reconciliation.** Every morning at 6 AM, a background job double-checks the lists against the database. If anything drifted (because Brevo was briefly down, or because someone hand-edited the list in the Brevo dashboard), the job fixes it.

If the reconciliation has to move more than 10 customers in one morning, a Slack alert posts in the payment channel. That's the signal that something upstream is failing silently and engineering should look.

**Practical implication for marketing:** do not manually add or remove people from these four lists in the Brevo dashboard. The next morning's reconciliation will undo your change. If you want to override membership for a specific customer, talk to engineering about adding them to a separate manually-curated list.

---

## 5. Hard fails versus soft fails

Every failed charge falls into one of two buckets, and the email we send depends on which one.

A **soft fail** means "the card might work next time." Common reasons: the customer's bank account was empty when we tried (they probably get paid in a few days), the bank refused for some temporary reason (often a fraud-protection auto-block that clears itself), or there was a hiccup somewhere in the chain. Stripe will keep retrying and there's a real chance it just works on its own.

A **hard fail** means "this card cannot be used as is." The card has expired, the number is wrong, or the bank has flagged it as stolen or invalid. Stripe could retry a thousand times and it would fail a thousand times. The customer has to do something for the payment to succeed.

The system reads what Stripe tells us about each failure and picks the right tone:

| Failure type | Examples | Email tone | Customer action expected |
| --- | --- | --- | --- |
| Soft | Insufficient funds, generic decline, temporary processing error | Friendly and patient: "We'll keep trying, no action needed unless you want to swap cards." | None, just wait |
| Hard | Expired card, wrong card number, stolen card flagged | Direct and clear: "Your card has expired, here's how to update it in 30 seconds." | Update the card on file |

About 80 percent of failures are soft and 20 percent are hard. The system fires a different email variant for each, so marketing maintains two versions of every dunning email in Brevo (one hard variant, one soft variant).

---

## 6. The 12 emails

There are twelve different emails the system can send. Marketing owns the visual design and copy of all of them inside Brevo. Engineering owns when each one fires.

Below is the full catalogue. Names match exactly what you'll see in the Brevo template list.

### The dunning sequence (eight emails)

These fire as Stripe retries the card. Same customer can receive any subset, depending on how many retries it takes.

| Order | Template name in Brevo | Tone | Subject line |
| --- | --- | --- | --- |
| 1 | Payment Recovery / 01 First failure, hard decline | Direct | Your card needs updating |
| 1 | Payment Recovery / 01 First failure, soft decline | Friendly | We could not process your payment |
| 2 | Payment Recovery / 02 Reminder, hard decline | Direct | Action required, please update your card |
| 2 | Payment Recovery / 02 Reminder, soft decline | Friendly | Quick reminder, your payment needs attention |
| 3 | Payment Recovery / 03 Final reminder, hard decline | Direct, urgent | Final reminder, update your card |
| 3 | Payment Recovery / 03 Final reminder, soft decline | Concerned | Your access is at risk |
| 4 | Payment Recovery / 04 Last chance, hard decline | Last call | Final notice, subscription ends tomorrow |
| 4 | Payment Recovery / 04 Last chance, soft decline | Last call | Final notice, access pauses tomorrow |

### The standalone emails (four)

These fire on specific events, not as part of a sequence.

| Template name in Brevo | When it fires | Subject line |
| --- | --- | --- |
| Payment Recovery / Card expires soon | About a week before a customer's next renewal, if their card on file will expire before that renewal | Your card expires before your next renewal |
| Payment Recovery / Payment recovered | A customer's card finally worked after one or more failures | Your payment is back on track |
| Payment Recovery / Subscription paused | We canceled the subscription because the card never recovered | Your subscription has been paused |
| Account / Sign in link | A customer requested a passwordless login link for any other reason | Your sign in link |

Each template has a small set of variable placeholders that get filled in at send time, things like the customer's first name, the amount they owe, and a one-click link to update their card. Marketing can change anything else in the template without help from engineering.

---

## 7. How Brevo plays into this

We use Brevo for two specific things and one we deliberately don't use.

**What we use Brevo for**

Email templates are stored in the Brevo dashboard. Marketing maintains the visual design, the wording, and any tweaks. Updating an email template doesn't require an engineering deploy or even an engineer in the loop. You go to Brevo, open the template, change what you want, save. The next email sent through that template uses your new version.

Contact lists are stored in Brevo too. The four lists from section 4 live in a folder called "Subscription Management" in the Brevo dashboard. Marketing can browse them, use them as audiences inside Brevo, or sync them out to Meta and Google.

Brevo also handles the actual mechanics of sending: deliverability, bounce handling, unsubscribe links, the SMTP plumbing. We never think about any of that.

**What we don't use Brevo for**

Brevo has a feature called "Automations" or "Workflows" where you can build flow charts inside Brevo that say "when X event happens, send Y email." We tried that and removed it. The reason: Brevo's automation builder had a setting where event data could fail to pass through to the email template, and four out of twelve of our automations had that setting wrong. Customers got emails with blank spaces where their name should be. Hard to debug from Brevo's side.

Now our backend code decides when each email goes out and calls Brevo's email-sending API directly. The template name and the variables travel together in the same call, so they can't get separated. Marketing doesn't lose anything from this change because the templates themselves are still in Brevo and still editable there. Marketing just doesn't see the "send" step as a Brevo workflow.

```
Old setup (removed):                  New setup (current):

Our code                              Our code
  fires event                           fires email directly
  to Brevo                              to Brevo
                                          with template ID + data
Brevo automation                          attached
  catches the event
  picks a template                    Brevo sends the email
  sends the email                       (no automation step)
```

---

## 8. The "card expires soon" flow

Most subscription cancellations don't happen because someone deliberately cancels. They happen because the card on file silently expires and the next charge fails. We try to head this off about a week in advance.

Here's how it works:

```
                         A week before
                         renewal date
                              |
                              v
                  Our system checks the
                  card on file at Stripe
                              |
                +-------------+-------------+
                |                           |
                v                           v
        Card is still valid          Card will expire
        on the renewal date          before renewal
                |                           |
        Do nothing               Send a "Your card expires
                                 soon" email with a one-click
                                 sign-in link
                                            |
                                            v
                                 Customer clicks the link
                                            |
                                            v
                                 They land on /settings,
                                 already signed in, on the
                                 payment-methods tab.
                                 No password needed.
                                            |
                                            v
                                 They add the new card,
                                 mark it as default, done.
```

The one-click sign-in link is a "magic link" (a temporary URL that signs the customer in). It expires after an hour for security, and if a customer clicks an expired link, they land on the regular sign-in page with their email already filled in and a small banner explaining what happened.

The customer's email address is added to the **Card expiring soon** list at this moment. Marketing can use that list for retargeting ads, but the urgency is genuinely lower than the dunning audience, so the creative should be softer.

---

## 9. The in-app banner

When a customer is in trouble (their last payment failed), they see this on top of every page of their AchieveCE dashboard:

```
+---------------------------------------------------------+
| (!) We couldn't process your last payment               |
|     AchieveCE Premium, 4 days left before access ends   |
|                                                         |
|     [ Update payment method ]   Dismiss                 |
+---------------------------------------------------------+
```

Clicking "Update payment method" takes them straight to the settings page, on the payment-methods tab. They see their saved cards, with red badges on expired ones and amber badges on cards expiring within 60 days. They can add a new card, optionally mark it as their default in the same flow, and remove old ones.

Dismissing the banner hides it for the current browser session only. The next time they come back, the banner is there again until the subscription is healthy. We do this on purpose because banner-blindness is a real problem and the worst outcome here is the customer losing access without realizing it.

---

## 10. Where customers manage their cards

The canonical place is **Settings -> Payment Methods**. Here's what's on that page:

- A list of every saved card (last four digits, brand, expiry date)
- A red "Expired" badge on cards that have passed their expiry month
- An amber "Expires soon" badge on cards expiring within 60 days
- A red banner at the top of the section when the default card is expired (because next renewal will fail)
- An amber banner at the top when any card is about to expire
- A "Set as default" button on every non-default card
- A "Delete" button on every card (with protection: we won't let them delete their last card if they have an active subscription)
- An "Add new card" button that opens a Stripe-secured form, with a "Make this my default payment method" checkbox if they already have other cards

This is where every email's main button (and the banner's main button) points. There was briefly a separate /dashboard/billing page that did roughly the same thing; we removed it and now any old links to /dashboard/billing automatically forward to the settings page.

---

## 11. Common questions from customers (and the right answers)

### "I got a 'payment failed' email but I haven't done anything different."

This is the most common email-related ticket. Tell them: their card was declined by their bank at our last automatic renewal attempt. We don't know exactly why, only that the bank said no. The most common reasons are an empty account on the day we charged, a fraud-protection auto-block (banks sometimes flag subscription charges as suspicious), or an expired card.

Action: send them to **Settings -> Payment Methods**. If the card looks valid there, suggest they call their bank. If the card is expired (red badge), they need to add a new one.

### "I just updated my card but I still see the banner."

This usually means Stripe hasn't tried the new card yet. Stripe retries on its own schedule (usually within a day or two). The banner will clear automatically once the next retry succeeds. Tell the customer to give it 24 to 48 hours.

### "My access was cut off but I never got any emails."

Two things to check:

1. Open Brevo and search for that customer's email. Look at their Activity log. If our emails are listed there with status "Sent," the problem is on the customer's side (Gmail filter, blocked, spam folder). If they're listed with status "Bounced" or "Hard bounce," their email address is invalid or unreachable.
2. If Brevo shows nothing, escalate to engineering. That means our system didn't try to send the emails, which is a bug.

### "I want to come back, can I just restart?"

Yes. They sign in, go to the courses they were interested in, and start a new subscription. Their course progress and any certificates they already earned are safe; nothing was deleted when the subscription was paused.

Note for marketing: this customer is in the **Access revoked** list. If they restart, they stay in that list (it's a historical record), but they may also re-enter **In dunning** later if they have payment trouble again. The lists can overlap.

---

## 12. What marketing should do with this

Three concrete campaigns to consider, ranked by likely impact.

**Win-back ads targeting the Access revoked list.** These customers have already proven they want what we sell (they subscribed once). Sync the list to Meta and Google as a custom audience. Show them an ad with a discount or a "we miss you" angle. Exclude customers who currently have an active subscription.

**Lookalike acquisition seeded on the Recovered list.** These customers have proven they're resilient payers; they had a payment problem and stuck with us to fix it. That's a great seed for prospecting campaigns. Build a Meta or Google lookalike from this list.

**Retargeting the In dunning list with a "fix your card" creative.** Time-sensitive (the audience cycles fast, most members leave within 7 days). Run a short ad campaign that points back to the AchieveCE settings page. Soft tone, no doom messaging; they're already getting that from us via email.

The "Card expiring soon" list is a lower-priority retargeting cohort. The renewal hasn't failed yet, so the urgency is gentler. A small ad budget here is probably enough.

---

## 13. What engineering and product should know

Most of this is in the technical guide at `.claude/docs/payment-recovery-system-guide.md` in the achievece-web repo. The short version:

- Every state transition is recorded in an append-only audit table called `payment_recovery_events`
- The system is idempotent on Stripe webhook replays
- A daily cron at 06:00 UTC enforces grace periods and reconciles the four contact lists
- All emails go out via direct API call to Brevo, not via Brevo automations
- The hard-versus-soft classifier is a pure function with unit tests
- Six SQL queries are ready to drop into Metabase for the standard recovery-rate dashboard

Open a ticket and pair with engineering if you need numbers that aren't already in Metabase.

---

## 14. Glossary

| Term | What it means here |
| --- | --- |
| **Dunning** | The process of asking a customer to settle an overdue payment. The four emails in the dunning sequence are our dunning emails. |
| **Past due** | A subscription whose last renewal charge failed but who still has access while we try to recover the payment. The grace window. |
| **Grace period** | The 7-day window between the first failed charge and the cancellation of the subscription. Usually matches how long Stripe will keep retrying. |
| **Hard decline** | A card failure that won't recover with retries; the card needs to be replaced. |
| **Soft decline** | A card failure that might recover with retries; the card itself is fine. |
| **Smart Retries** | Stripe's automatic retry feature. It tries failed charges again at intervals it thinks are more likely to succeed. We don't manage retry timing ourselves. |
| **Network Updates** | Stripe's back-channel where card networks (Visa, Mastercard) automatically tell Stripe when a customer gets a new card. We benefit from this silently; about 260 charges in any 90-day window are saved this way without anyone realizing. |
| **Brevo** | The email platform we use. Stores templates, sends emails, hosts our contact lists. |
| **Magic link** | A one-time sign-in URL we email to customers. They click it, land signed in, no password needed. Expires after an hour. |

---

If anything in this guide is wrong, outdated, or unclear, file an issue in the achievece-docs repository or ping the team. This document is meant to stay accurate, and the fastest way to keep it that way is to flag problems early.
