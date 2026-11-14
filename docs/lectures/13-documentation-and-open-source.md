# ISP Lecture 13 — Software Documentation & Open-Source Software

---

## Part 1 — Software Documentation

### 1. What is software documentation?

Written text or media that explains how a software system, application, or codebase
works. It carries all the information needed to **understand, use, and maintain** the
software.

- **Content:** guides, manuals, technical descriptions, tutorials.
- **Audience:** differs per document type — end-users, developers, testers, system
  administrators, stakeholders.

### 2. Why documentation matters

| Benefit | Why |
| --- | --- |
| Enhances user experience | Step-by-step instructions let users actually use the software |
| Eases maintenance & updates | Developers understand internals, so fixes and updates are safer |
| Improves collaboration | Devs, PMs, and QA share one understanding of goals and progress |
| Reduces knowledge loss | Critical knowledge survives team members leaving |
| Helps onboarding | New developers and users get productive faster |
| Legal & compliance | Industry regulations met; licensing terms properly observed |

### 3. Types of software documentation

#### A. User documentation

Instructions aimed at helping **end-users accomplish tasks**.

- **Characteristics:** plain language, task-based, step-by-step, visual aids
  (screenshots, diagrams, videos).
- **Examples:** installation guides, FAQs, user manuals (features + troubleshooting).
- **Importance:** raises user satisfaction and cuts support workload via self-help.

#### B. API documentation

How developers interact with an application's API. Audience: developers integrating
or extending the system.

- **Characteristics:** clear syntax (functions, endpoints, parameters, inputs/outputs),
  authentication instructions, code samples, error-code reference.
- **Examples:**
  - REST API docs — HTTP methods, endpoints, parameters, payload structures
  - GraphQL API docs — schema types, queries, mutations
  - SDK docs — using the API from a specific language SDK
- **Importance:** smooth third-party integration, keeps the software flexible, fewer
  integration errors.

#### C. Developer documentation

Internal detail on how the software is built: codebase architecture, contribution and
maintenance rules.

- **Characteristics:** inline code comments, module/algorithm breakdowns, contributing
  guidelines, architecture diagrams.
- **Examples:**
  - Code comments — explaining complex logic
  - Design documents — structural patterns, data flows, architectural choices
  - Contributor guides — branching strategy, code style, PR procedure
- **Importance:** safe code modification, better team/open-source collaboration, no
  single-developer knowledge dependency.

#### D. System documentation

Overview of the overall architecture and how components interact. Audience: sysadmins,
IT engineers, architects.

- **Characteristics:** high-level component relationships, configuration/deployment
  guides, hardware/software requirements, backup & disaster-recovery plans.
- **Examples:** architecture diagrams, deployment instructions (production setup),
  security guidelines (hardening, permission management).
- **Importance:** supports deployment and maintenance, simplifies infrastructure
  monitoring, speeds up system-level troubleshooting.

#### E. Test documentation

Testing strategy, test cases, execution procedure, and results. Audience: QA and
testers.

- **Characteristics:** test plans, test case definitions, execution results (pass/fail),
  bug report logs.
- **Examples:** unit test docs (per function/class), integration test docs (inter-module),
  acceptance test docs (requirement verification).
- **Importance:** verifies functional and non-functional requirements, catches issues
  before release, keeps a historical quality record.

### 4. Best practices

- **Clarity and simplicity** — avoid unnecessary jargon; keep it accessible.
- **Consistency** — standardise terminology, formatting, and architectural definitions
  across all docs.
- **Use visuals** — diagrams, flowcharts, screenshots, videos for complex workflows.
- **Keep it up to date** — update docs in tandem with code changes.
- **Searchable and accessible** — logical structure, table of contents, index tags,
  cross-references.

### 5. Tools

**Documentation generators**

| Tool | Use |
| --- | --- |
| Markdown | Lightweight markup for READMEs and repository docs |
| Sphinx | Python doc generator (reStructuredText or Markdown) |
| MkDocs | Fast static site generator for project documentation |
| Doxygen | Automated docs from annotated C, C++, and Java code |

**Version control & collaboration**

- **GitHub** — host and version-control docs alongside source code via Git.
- **GitLab** — same, plus embedded CI/CD pipelines and documentation features.

---

## Part 2 — Open-Source Software (OSS)

### 1. What is open-source software?

Software distributed under a license granting users the right to **inspect, modify, and
redistribute** its source code. An **open-source license** is the legal document
defining the terms of use, modification, and distribution (e.g. MIT, GPL, Apache).

### 2. Key characteristics

- **Free access to source code** — the raw code is public.
- **Permission to modify** — freedom to tweak and extend functionality.
- **Distribution rights** — freedom to share original or modified code.
- **Transparency** — security, performance, and features are open to inspection.
- **Collaborative development** — worldwide participation by individuals and companies.

### 3. Popular examples

| Project | What it is |
| --- | --- |
| Linux | OS kernel — servers, enterprise, embedded |
| Apache HTTP Server | Widely used web server |
| Mozilla Firefox | Privacy-oriented web browser |
| Visual Studio Code | Extensible source code editor |
| WordPress | CMS powering a major portion of the web |
| MySQL | Relational database management system |

### 4. Development model

- **Global collaboration** — shared contributions accelerate innovation.
- **Community-driven** — roadmaps, bug reports, and enhancements debated publicly.
- **Permissive sharing** — accessible terms intended to maximise usability.

### 5. Key benefits

- **Community collaboration** — diverse worldwide contributors (Linux kernel, Apache
  projects).
- **Transparency & QA** — public peer review yields trustworthy code and faster fixes.
- **Security** — community vulnerability hunting enables quick patching (e.g. the rapid
  response to the OpenSSL Heartbleed bug).
- **Rapid innovation & customisation** — fast feature evolution, adaptable to individual
  needs (e.g. Google's Kubernetes).
- **Cost effectiveness** — no licensing fees for individuals or enterprises.
- **Educational resource** — real-world code to study design patterns and remote
  collaboration.

### 6. The open-source ecosystem

```
+-------------------------------------------------------------------+
|                        Open-Source Project                        |
+-------------------------------------------------------------------+
       |                                      |
       v                                      v
+-----------------------+              +-----------------------------+
|        Roles          |              |   Foundations & Platforms   |
+-----------------------+              +-----------------------------+
| - Contributors        |              | - GitHub / GitLab           |
| - Maintainers         |              | - Apache Software Foundation|
| - End-Users           |              | - Linux Foundation          |
+-----------------------+              | - Free Software Foundation  |
       |                               +-----------------------------+
       v                                              |
+----------------------------------+                  |
|    Communication & Workflow      |                  v
+----------------------------------+      +-------------------------+
| - Forums / Slack / Discord       |      |    Git Workflow Rules   |
| - Conferences (FOSDEM)           |      +-------------------------+
| - Mailing Lists & Issue Trackers |      | - Forking               |
+----------------------------------+      | - Pull Requests (PRs)   |
                                          +-------------------------+
```

### 7. Challenges

- **Maintainer burnout** — small core teams overwhelmed by issues and PRs.
- **Documentation decay** — docs lag behind rapid code change.
- **Licensing & legal obligations** — keeping dependency licenses compatible and terms met.
- **Project sustainability** — no stable financial backing (historically, OpenSSL's
  resource constraints).

---

## Part 3 — Open-Source Licensing

### 1. Why licenses matter

- **Protects creator rights** — preserves author IP and guarantees attribution.
- **Sets clear usage terms** — states explicitly whether code may be used commercially
  or modified.
- **Mitigates legal risk** — shields both creator and consumer from liability and
  compliance problems.

### 2. Taxonomy

```
                       Open-Source Licenses
                                |
       +------------------------+------------------------+
       |                                                 |
       v                                                 v
  Permissive Licenses                            Copyleft Licenses
  (Minimal Restrictions)                         (Reciprocal Terms)
       |                                                 |
       +--> MIT License                                  +--> Strong Copyleft
       +--> Apache 2.0                                   |    - GPL  (General Public License)
       +--> BSD (2-Clause / 3-Clause)                    |    - AGPL (Network / Web Services)
                                                         |
                                                         +--> Weak / Hybrid Copyleft
                                                              - MPL (Mozilla Public License)
                                                              - EPL (Eclipse Public License)
```

#### A. Permissive licenses

Allow essentially unrestricted use, modification, and redistribution — **including
inside closed-source proprietary software**.

- **MIT** — highly permissive; requires only that the copyright/license notice be retained.
- **Apache 2.0** — permissive, plus explicit patent grants and trademark protections.
- **BSD (2-Clause / 3-Clause)** — similar to MIT; the 3-Clause variant adds a
  non-endorsement clause, barring use of contributor names for marketing without permission.

#### B. Copyleft (reciprocal) licenses

Ensure derivative works stay open-source under the same terms.

- **GPL** — strong copyleft; derivative software must also be GPL-licensed.
- **AGPL** — extends copyleft to network service deployments (SaaS/cloud).
- **MPL / EPL** — file-level (hybrid) copyleft: changes to existing MPL/EPL files must
  stay open, but new files in the project may use a separate license.

#### C. Other license types

- **Creative Commons (CC)** — intended for non-code artifacts: documentation, graphics, audio.

### 3. Choosing and managing a license

**Selection criteria**

| Goal | Choose |
| --- | --- |
| Maximum adoption and commercial integration | Permissive — MIT / Apache 2.0 |
| Guarantee derivative work stays public | Copyleft — GPL / AGPL |

**Helper resources**

- [ChooseALicense.com](https://choosealicense.com) — GitHub's guide
- [TLDRLegal](https://tldrlegal.com) — plain-English license summaries
- [OpenSource.org](https://opensource.org) — OSI license definitions

**Compatibility & compliance**

- **Compatibility** — combining conflicting licenses (e.g. GPL code linked with
  permissive closed-source modules) can cause compliance violations.
- **Attribution & disclosure** — retain copyright notices and publish modification logs.
- **Automated compliance tracking:**
  - **FOSSA** — dependency scanning and license policy engine
  - **Mend** (formerly WhiteSource) — dependency and license compliance management
  - **GitHub license scanning** — built-in license discovery and security alerts
