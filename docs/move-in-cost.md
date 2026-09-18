# Deposit in months and move-in cost

Bangalore deposits run from one month to a year of rent, so a deposit in rupees says little on its own. Each card
lists the four figures that decide affordability on their own labelled lines: rent per month, maintenance per
month, the deposit with its size in months, and the total cash needed to move in.

## The formula

`moveInCost()` in `packages/core/src/money.ts`:

```
total = rent + deposit + maintenance + (listed_by = 'broker' ? rent : 0)
```

It is the cash you hand over on day one: the first month, the deposit, one month of maintenance where the portal
publishes it, and one month of brokerage when the listing comes from a broker rather than an owner. Brokerage is
an assumption, not scraped data. One month is the Bangalore norm; the card's tooltip spells the breakdown out so
the assumption is visible rather than hidden in a number.

`moveInCostColumn()` in `packages/db/src/queries/hits.ts` is the SQL twin, used only for `ORDER BY` when sorting
by move-in cost. The integration test asserts the SQL ordering matches the order computed in TypeScript, which is
what catches the two drifting apart.

## Deposits the portals got wrong

The data holds listings with a deposit of ₹1 against a rent of ₹15 lakh, and a few with a deposit over eighteen
months. 135 of 11,359 active listings with a deposit sit below half a month.

`isPlausibleDeposit()` accepts a deposit between 0.5 and 18 months of the rent. Anything outside that range is
treated as unknown: no month figure on the card, no move-in total, sorted last under move-in cost, and excluded
from the deposit filter. Without the floor, the ₹1 deposits took the top of the cheapest-move-in list.

A card with no usable deposit says "not listed" on that line and drops the move-in line, rather than showing a
total that quietly leaves the deposit out.

## The filter

`depositMaxMonths` accepts 1 to 6 whole months and matches `deposit <= rent * months`, plausibility included.
Listings with no published deposit cannot match, which the results page says out loud, because a third of the
data has no deposit at all.
