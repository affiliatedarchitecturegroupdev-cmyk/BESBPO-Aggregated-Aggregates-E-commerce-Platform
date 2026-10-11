# Plan your build

A homepage band, straight after Shop by Build Stage, that sells project lists
([PROJECT_LISTS.md](PROJECT_LISTS.md)): four steps on the left — save by build
stage, add quantities as you go, share it, order or quote the lot — with links to
Shop by Build Stage and the calculators, and a card on the right that changes with
the visitor.

| Visitor | Card |
|---|---|
| Signed out | "Start a project list" and **Sign in to start** (back to `/account/projects` after signing in) |
| Signed in, no projects | "No projects yet" and **Start your first project** |
| Signed in, with projects | Their most recently changed project: name, site, last updated, estimated materials (today's list prices), saved products, the build stages it covers, how many lines still need a quantity or a quote, **Open project**, and **All n projects** when there's more than one |

## How it works

- The band is server-rendered and the same for everyone, so the homepage stays
  prerendered and cached. The card (`YourProjectCard`, client) calls the
  `latestProject()` server action after the page loads and shows a skeleton until
  it answers.
- `latestProject()` (`app/account/projects/actions.ts`) returns early for signed-out
  visitors without calling the API. For a signed-in customer it reads their lists,
  picks the one with the latest `updatedAt` and summarises it with the same
  `summarise()` the project page uses, so the estimate matches the list exactly.
- If the call fails, the card falls back to the signed-out view.

## Code

- `apps/web/src/components/merchandising/PlanYourBuild.tsx`: the band.
- `apps/web/src/components/merchandising/YourProjectCard.tsx`: the card.
