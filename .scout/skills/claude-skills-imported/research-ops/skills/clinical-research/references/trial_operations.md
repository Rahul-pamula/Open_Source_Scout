# Trial Operations and Feasibility

Reference for study feasibility and the phase-gate decision. Pairs with `phase_gate_scorer.py`.

## Feasibility is the silent killer

Most trials that fail do not fail on science — they fail on **enrollment**. A study powered for 240 patients across 18 sites assumes a recruitment rate per site per month that is often optimistic by 2-3×. The feasibility scorer enforces two reality checks: the **eligible pool ratio** (eligible population ÷ target enrollment should comfortably exceed 3×, ideally 10×) and **site capacity** (sites × nominal enroll rate × duration vs target). The "enrolling funnel" loses patients at screening, eligibility, and consent — Lasagna's Law (clinicians overestimate the eligible pool the moment a trial opens) is the operative caution.

## Good Clinical Practice (GCP)

ICH E6(R2) — and the in-progress E6(R3) — define the responsibilities of sponsors, investigators, and monitors; informed consent; protocol adherence; and the trial master file. A study design that cannot satisfy GCP roles is not gate-ready. Name the Principal Investigator, Medical Monitor, and Biostatistician before the gate.

## Risk-based monitoring (RBM)

Centralized, risk-based monitoring (FDA's 2013 guidance, expanded 2023; TransCelerate's RBM methodology) replaces 100% source-data verification with targeted monitoring of the data and processes that most affect patient safety and data integrity. Building RBM into the design lowers operational complexity (a scored dimension).

## Operational complexity drivers

Visits per patient, invasive procedures, central-lab logistics, imaging adjudication, and the number of countries all raise operational complexity and recruitment difficulty. The scorer inverts complexity (simpler design → higher score) because every added visit or procedure raises dropout and cost-per-patient.

## Budget reality

Cost-per-patient varies enormously by area (a digital-therapeutic at ~$6k/patient vs a biologic at ~$50k+/patient). The scorer compares planned budget to a profile benchmark and flags under-funding below 75% of benchmark. Research-finance (the sibling skill) owns the full program budget; this scorer only checks gate-level adequacy.

## Sources

1. ICH E6(R2), _Good Clinical Practice_ (2016); ICH E6(R3) draft (2023).
2. FDA, _A Risk-Based Approach to Monitoring of Clinical Investigations_ (2013; Q&A revision 2023).
3. TransCelerate BioPharma, _Risk-Based Monitoring Methodology_ position papers.
4. CTTI (Clinical Trials Transformation Initiative), _Recruitment_ and _Feasibility_ recommendations.
5. Lasagna, L. — "Lasagna's Law" on the overestimation of eligible patients (clinical-trials folklore widely cited in feasibility literature).
6. Treweek et al., _Strategies to improve recruitment to randomised trials_ — Cochrane Database Syst Rev 2018.
7. Getz & Campo, _Trial complexity and protocol design_ — Tufts CSDD impact reports.
