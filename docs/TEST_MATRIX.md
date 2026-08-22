# OmniMandate v1 Test Matrix

Target meaningful coverage. The list may grow after runtime-specific testing.

## A. Vault and authorization

1. create vault + mandate v1
2. create zero-funded vault if allowed by final runtime design
3. fund vault
4. reject non-owner funding
5. pause vault
6. resume vault
7. reject non-owner pause/resume
8. replace active agent
9. reject non-owner agent replacement
10. former agent cannot create new request
11. former agent cannot adjudicate old request
12. owner recovery of unreserved funds
13. reject recovery that consumes reservation

## B. Mandate versioning

14. initial mandate version
15. create subsequent version
16. preserve prior version
17. reject non-owner mandate update
18. request snapshots version/hash
19. later version does not mutate request
20. reject invalid hard-policy configuration
21. reject new period budget below current spent + reserved
22. allow safe budget increase
23. allow safe budget decrease above current pressure
24. period_seconds remains immutable

## C. Spend requests

25. current agent creates valid request
26. reject unauthorized requester
27. reject paused-vault request
28. reject zero recipient
29. reject zero amount
30. reject single-spend cap violation
31. reject insufficient unreserved vault balance
32. reject period-budget violation
33. reserve exactly once

## D. Evidence

34. reject non-HTTPS primary URL
35. reject non-HTTPS corroboration URL
36. reject identical URLs
37. reject malformed primary hash
38. reject malformed corroboration hash
39. reject future observation timestamp
40. reject stale evidence at submission
41. stale-after-wait request fails at adjudication
42. primary hash mismatch fails closed
43. corroboration hash mismatch fails closed
44. unavailable evidence fails closed

## E. Intelligent adjudication

45. COMPLIANT + CORROBORATED -> APPROVED
46. NON_COMPLIANT + CORROBORATED -> DENIED
47. UNCLEAR + CORROBORATED -> DENIED
48. COMPLIANT + CONFLICTING -> DENIED
49. COMPLIANT + INSUFFICIENT -> DENIED
50. prompt-injection evidence cannot override task
51. reason wording may vary with same bounded result

## F. Resolution accounting

52. approval converts reservation to spent
53. approval credits exact immutable amount
54. denial releases reservation
55. denial creates no award
56. owner cancels unresolved request
57. requester cancels own unresolved request
58. cancellation releases reservation exactly once
59. reject cancel after resolution
60. reject double adjudication
61. reject double cancellation
62. lifetime spent correct

## G. Pause behavior

63. pause blocks new request
64. pause blocks new adjudication
65. pause still allows owner cancellation
66. pause still allows agent replacement
67. pause does not block claimable withdrawal

## H. Period rollover

68. no rollover before boundary
69. exact-boundary rollover
70. multiple elapsed periods advance deterministically
71. rollover resets spent
72. rollover preserves unresolved reservation
73. old reservation consumes new-period capacity
74. old request approved in new period moves reserved -> spent without changing
    total budget pressure
75. old request denied in new period frees capacity
76. post-rollover request cannot oversubscribe budget

## I. Withdrawals

77. recipient withdraws claimable award
78. owner withdraws recovered funds
79. zero-claimable semantics match chosen runtime behavior
80. double withdrawal cannot transfer twice

## Bradbury network scenarios

Keep live tests smaller than Direct Mode.

### Scenario A — Approved
Policy allows spend; evidence matches; `COMPLIANT / CORROBORATED`; exact
requested amount credited.

### Scenario B — Policy violation
Evidence proves the purchase but the mandate prohibits its purpose/category;
`NON_COMPLIANT`; no award.

### Scenario C — Evidence conflict
Spend purpose is policy-allowed but evidence records materially conflict;
`CONFLICTING`; no award.

## Reporting

Every gate is reported as:

- PASS
- FAIL
- NOT RUN

Transaction `ACCEPTED` alone is not proof of the intended execution result.
Inspect execution result and resulting contract state.
