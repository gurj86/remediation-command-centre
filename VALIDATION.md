# Validation record

Validated locally on 15 October 2026. Fixed synthetic snapshot: 30 September 2026.

## Automated checks

- Python syntax/data generation succeeds with no external packages.
- Four Python test groups pass: unique IDs, timeline validity, outcome/redress consistency; population, queue, cause, risk and award distribution reconciliation; QA and risk denominators, paired-theme evidence; weekly/monthly windows, outlier count and seeded reproducibility.
- Scenario checks pass: known baseline arithmetic, increasing case capacity, QA-constrained completion, zero population, zero sampling, handling-time sensitivity and zero uphold rate.
- JavaScript syntax checks pass.

## Desktop browser verification

- Landing composition inspected at approximately 1260px viewport.
- Plotly WebGL 3D harm network visibly renders, including central harm node, seven cause nodes, links and labels.
- Cause-button selection changes the evidence panel; Incorrect calculations shows 1,873 cases, consistent with the generated extract.
- Case explorer shows matching count and 100-case limited table, and closes correctly.
- Risk heatmap and 3D landscape render.
- Reducing case reviewers from 24 to 2 changes the baseline forecast from 49 to 588 working days. Reset restores baseline.
- Brief selection displays source-linked calculated values; local reviewer acknowledgement changes status.
- No browser warning/error logs observed during these flows.

## Limits

Browser checks are representative interactions, not exhaustive accessibility or cross-browser certification. No real customer workflow, API integration or production service-level guarantee is tested. Deployment status and URLs are reported separately after publishing.

