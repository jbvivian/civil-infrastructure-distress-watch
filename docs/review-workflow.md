# Signal Review Workflow

The review layer treats every extracted signal as a cue for professional review, not a
claim that a project is failing.

## Recommended sequence

1. Filter Signals or Projects to **Live-source only**.
2. Open the linked source document and verify the highlighted trigger term in context.
3. Review the extracted entities and any suggested project match.
4. Assign only when the public record supports the project link.
5. Edit civil-firm relevance when the deterministic default misses project context.
6. Promote material items to the weekly brief.
7. Dismiss false positives or routine items with a reason.

## Review states

| State | Meaning |
| --- | --- |
| Needs Review | Unassigned extraction requiring a decision |
| Assigned | Linked to a tracked project |
| Promoted | Manually prioritized in the weekly brief |
| Dismissed | Hidden by default and excluded from the weekly brief |

A promoted signal can be unpromoted. Dismissed signals remain available through the
Dismissed filter and on their source-document detail page.

## Project matching

Automatic assignment requires the complete tracked project name. Weaker matches use
municipality, distinctive project-name words, and compatible project-type language to
produce a suggestion. Suggestions never auto-assign.

Entity extraction records candidate project names, owners, vendors, funding programs,
amounts, dates, contract or resolution identifiers, and infrastructure project types.
These are review aids, not resolved entities.

## Deterministic explanations

Severity and confidence explanations cite the matched rule term and category. Project
status explanations use active, non-dismissed signals. `Confirmed Issue` requires
explicit source language for a defined delay, overrun, claim, litigation, rebid, audit
finding, or major rescope; it does not mean the overall project has failed.

## Prototype limitations

- Reviewer identity is stored as `Local reviewer`.
- There is no authentication, undo history, or concurrent-write protection.
- Regex entity candidates can be incomplete or ambiguous.
- Highlighting is exact-term based and is not a document annotation system.
