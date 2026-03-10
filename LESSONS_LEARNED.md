# Lessons Learned: 20+ Years Building Software at Scale

> **Audience:** Engineering leaders, architects, and anyone building systems with growth ambitions.
> 
> These are patterns and anti-patterns I've learned (often painfully) over two decades. Not all are captured in PatientRecords, but many inform its design. Apply selectively based on your context, not prescriptively.

---

## Core Principles

### 1. Organizational Structure Determines Architecture

**Mel Conway's Law (1968):** "Any organization that designs a system will produce a design whose structure is a mirror image of the organization's communication structure."

**What this means:** Your architecture will reflect your org chart. Always.

**I've learned:**
- **Monolithic architecture** naturally emerges from centralized orgs (1 VP Engineering, unified team)
- **Microservices architecture** emerges from federated orgs (multiple product leaders, independent teams)
- **Module federation architecture** emerges from matrix orgs that need both autonomy and coordination

**Reverse corollary:** If you change your architecture without changing your org structure, it will fail.

**Example from PatientRecords:** We structured teams by clinical domain (Demographics, Vitals, Labs, etc.) not by function (frontend, backend). This is why module federation works—there's a 1:1 mapping between org structure and software structure.

### 2. Scalability Has Phases

| Phase | Team Size | Bottleneck | Solution |
|-------|-----------|-----------|----------|
| **Startup** | <10 | Iteration speed | Simplicity, monolith |
| **Series A** | 10-30 | Code coordination | Version control, CI/CD |
| **Series B** | 30-60 | Deployment coordination | Microservices, module federation |
| **Series C** | 60-150 | Organizational complexity | Clear boundaries, autonomous teams |
| **Enterprise** | 150+ | Information flow | Better tooling, process, governance |

**What I've learned:** Organizations almost always try to solve the current phase's bottleneck using previous phase's tools. This fails.

**Series B company problem:** "Too many deploys, causing conflicts."
- **Wrong solution:** Monolith becomes immobilized.
- **Right solution:** Independent services, independent deploys.

### 3. Simple Scales, Complex Doesn't

**Principle:** Architecture should only be as complex as your org structure requires.

**I've learned:** 
- Simple architecture with growing org = friction, slow delivery
- Complex architecture with small org = over-engineering, slow feature delivery

**Both are bad.** The goal is to match complexity to organizational need.

**Series A mistake I made (3 teams, 20 engineers):**
- Over-engineered microservices, event bus, distributed tracing
- Took 6 months to build first feature
- Should have: Monolith + clear team boundaries

**Series C win I had (150 engineers):**
- Invested in Module Federation + federated deployment
- First month painful, but 5x velocity increase by month 6
- Probably saved org 2 years of velocity loss

### 4. Every Architecture Pattern Has a Shelf Life

**Monolithic Architecture Shelf Life (Teams):**
- ✅ 1-30 engineers: Optimal
- ⚠️ 30-50 engineers: Getting difficult
- ❌ 50+ engineers: Fighting it

**Microservices Shelf Life (Teams):**
- ❌ <20 engineers: Massive over-engineering
- ✅ 50-300 engineers: Sweet spot
- ⚠️ 300+ engineers: Coordination becomes hard

**Module Federation Shelf Life (Frontend Teams):**
- ❌ <15 engineers: Over-complicated
- ✅ 30-200 engineers: Solves real problem
- ⚠️ 200+ engineers: You need even finer grained architecture

**Critical insight:** The best architecture for your org right now becomes the wrong architecture in 18 months if you grow or shrink significantly.

---

## Engineering Leadership Lessons

### 5. Velocity Is Your Most Important Metric

I've been in orgs measuring:
- Code quality (static analysis scores)
- Test coverage (coverage%)
- Performance (milliseconds)
- Cost (dollars/request)

**All matter.** But none matter more than: **How many quality features ship per month?**

Everything else is in service of this.

**From PatientRecords perspective:** Why Module Federation? Because it increased deployment velocity from 2/week to 20/week. That's the win. Everything else is detail.

### 6. Architecture Decisions Are About People, Not Technology

**The mistake I made (twice):**
- "REST API is better than GraphQL, let's standardize"
- Result: Team that knew GraphQL well works around the system
- Result: Worse code quality, lower productivity

**The pattern I learned:**
- Standardize on interfaces, not implementations
- If team builds better with their tool, let them (within reason)
- Focus on contracts, not tech stacks

This is why PatientRecords has both Angular and React. Not because technology diversity is good. Because **the Procedures team was 2 React experts and 1 Angular developer**. Forcing them to learn Angular would make them slower and unhappy.

### 7. You Can't Scale Culture With Org Charts

I've tried to scale culture by:
- Adding organizational layers
- More detailed procedures
- Stricter code review processes

**Every time:** Culture degraded. Not improved.

**What actually works:**
- Hire people with the culture values
- Lead by example
- Create space for people to make decisions
- Trust autonomic teams

**From PatientRecords:** Each module team has autonomy to:
- Choose their testing approach (as long as coverage >= 70%)
- Choose their deployment cadence
- Choose how they do code review
- Choose which libraries to use (as long as they're approved)

Result: Better culture, higher engagement, better quality.

---

## Technical Architecture Lessons

### 8. Shared State Is Your Largest Risk

**Pattern I've repeatedly seen fail:**
1. Build monolith with global shared state
2. Extract to microservices
3. Services still need shared state
4. Implement distributed cache (Redis) as "solution"
5. Distributed cache becomes subtle bugs, race conditions, nightmares

**What I've learned:**
- Shared state is OK at small scale (1-3 services)
- At scale, minimize shared state with clear ownership
- Each service owns its data, others read via API

**From PatientRecords:** Patient context is "shared" but with clear pattern:
```typescript
// Observable pattern - single source of truth in localStorage
patientContext$: Observable<Patient> = 
  interval(500).pipe(
    switchMap(() => this.getFromStorage()),
    distinctUntilChanged()
  )
```

Not a mutable object that multiple modules fight to update. An Observable stream each module subscribes to.

### 9. Error Handling at Scale Is About Degradation, Not Perfection

**Mistake:** Try to prevent all errors.
**Result:** Complex error handling, every path has edge cases you didn't think of.

**Better approach:** Accept some errors will happen. 
- **Tier 1:** Prevent critical errors (can't login, data loss)
- **Tier 2:** Handle degradation gracefully (feature unavailable, use cache)
- **Tier 3:** Log and monitor (we know it failed, team will fix)

**From PatientRecords:**
```typescript
// If module fails to load, show placeholder not 500 error
loadRemoteModule(config).catch(() => PlaceholderModule)

// If patient context service fails, use cached value
patientContext$ = 
  this.api.getPatient(id).catch(() => this.cache.get(id))

// If core auth fails, log and redirect to login
auth$.pipe(catchError(e => { 
  logError(e); 
  redirectToLogin(); 
}))
```

### 10. Documentation Is a Competitive Advantage

I've worked at orgs that document everything (slowed innovation) and orgs that document nothing (innovation suicide).

**Pattern that works:**
- Document the "why" not the "how"
- Document decisions and trade-offs, not implementation
- Document assumptions and constraints

**From PatientRecords:**
- ✅ Why we chose Module Federation   
- ✅ How shared dependencies work
- ✅ What happens when modules load
- ❌ Not: Line-by-line code comments (code should be self-explanatory)

**Why this matters:** In 2 years, when you're hiring new engineers, documentation lets them understand your reasoning. Code comments age. Architectural decisions don't.

---

## Team Scaling Lessons

### 11. Hire for Growth, Not Today

Biggest mistake I made early:
- Hired senior architects when I had 10 engineers
- They got bored, left for bigger challenges
- Hiring was expensive and disruptive

**What I learned:**
- **For 10-20 engineers:** Hire strong mid-level engineers (5-8 years exp)
- **For 20-50 engineers:** Hire senior engineers (10-15 years exp)
- **For 50+ engineers:** Hire staff/principal engineers (15-20+ years exp)

Hiring too senior too early creates frustration. Hiring too junior too late creates chaos.

### 12. You Can't Outgrow Poor Fundamentals

I've seen teams with bad practices try to fix it by growing the team.

**Reality:**
- Bad code reviews → Add more code review
- Slow deployments → Add more engineers (they just work slower)
- Poor testing → Add QA team (bugs still increase)

**First failures always come from:**
- Weak fundamental practices (tests, code review, deployment process)
- Not from team size

**Fix the fundamentals first.** Then scale the team.

For PatientRecords:
- All modules run tests pre-commit
- All code review gatekeeping is automated (linting, tests)
- Deployment is push-button (no manual steps)
- These were expensive upfront, but enabled autonomy later

### 13. Remote-First Teams > Office-First Teams at Scale

I've been on teams in both configurations.

**Small office teams (5 people):** Benefits from hallway conversations, impromptu problem solving.

**Large distributed teams (100+ people):** Benefits from async communication, written context, documentation.

**What I've learned:** At scale, office proximity creates false sense of alignment. People physically near each other think they're coordinated, but aren't.

**Remote-first forces rigor:**
- Write decisions down
- Make context explicit
- Async-friendly communication (over Slack, not quick meetings)
- Result: Better scale, higher autonomy

---

## Deployment & Operations Lessons

### 14. Deployment Frequency Is The Leading Indicator

**Observation:** Deployment frequency correlates with:
- Quality (more frequent deploys = find bugs faster)
- Team happiness (less blame, faster recovery)
- Innovation speed (experiments deployed quickly)

**Pattern I've learned:**
- 1 deploy/week: Something is wrong
- 5 deploys/week: Healthy org
- 20+ deploys/week: Excellent
- >100 deploys/week: Usually too much ceremony

**From PatientRecords:** Goal of Module Federation was to increase deploy frequency from 2/week to 15-20/week. That's a 10x improvement in agility.

### 15. Monitoring Should Be Automated, Boring, and Predictable

I've worked at places with:
- **Over-monitoring:** AlertsAlert generator goes off every 5 minutes, everyone ignores it
- **Under-monitoring:** Production breaks, no one knows until users complain

**Pattern that works:**
- Alert only when human intervention needed
- Alert should have clear "what to do" runbook
- Most monitoring is automated checking (humans don't look)

**From PatientRecords (should have added):**
```yaml
alerts:
  - criticial: "Module failed to load"
    action: "Rollback module, check logs"
  - critical: "Auth service timeout"
    action: "Check database, check cache"
  # Not alerting on:
  # - Normal variance in latency
  # - Single occasional 404
  # - Expected test traffic
```

Would implement this before production deployment.

### 16. You Need Blue-Green or Canary Deployments at Scale

**Wrong approach:** Deploy to all servers instantly.

**Better approach:** Deploy to 10% first, check for errors, then 100%.

**Pattern from PatientRecords:**
```yaml
# Deployment v1.2.3
- Old version: 90% traffic
- New version: 10% traffic
# Monitor for 5 minutes
- If error rate up: Rollback instantly
- If error rate same: 100% new version
```

Takes 5 more minutes but saves you from production incidents.

---

## Hiring & Organization Lessons

### 17. Smart People in Bad Systems Produce Bad Results

I thought bad code meant bad engineers.

**Reality:** I've seen brilliant engineers produce terrible code because:
- Unrealistic deadlines
- Bad architecture constraints
- Lack of testing
- Poor process
- Toxic culture

**Better assessment:** Look at output quality, not engineer quality directly.

Bad output + smart people = process problem
Bad output + weak engineers = hiring problem

### 18. Career Ladders With Low Ceiling = Brain Drain

I've been on teams where the highest role was "Senior Engineer."

**Result:** Best engineers left when they wanted to grow.

**Pattern that works:**
- Individual contributor path: Engineer → Senior → Staff → Principal
- Management path: Lead → Manager → Director → VP
- Both paths respected, paid equally

This lets people choose growth direction without leaving the org.

**From PatientRecords:** Module Federation designed so that:
- Junior engineer can be productive in one module
- Senior engineer can lead module team
- Staff engineer can design multi-module patterns
- Principal engineer can drive org-wide architecture

Everyone has space to grow without leaving.

---

## Decision-Making Lessons

### 19. Reversible vs Irreversible Decisions

**Pattern I've learned (from Jeff Bezos, made it my own):**

**Irreversible decisions:**
- Pick core technology stack
- Hire/fire senior leader
- Choose cloud provider
- Fundamental architecture choice

**Process:** Slow, lots of review, lots of data

**Reversible decisions:**
- What testing framework
- Which linting tool
- Module naming scheme
- Directory structure

**Process:** Fast, decide and move

**Mistake I made:** Treating reversible decisions like irreversible (over-committees on naming), and irreversible like reversible (quick architectural decisions that stuck us for 5 years).

### 20. The Best Architectures Feel Boring

I've pitched:
- Event-driven systems with CQRS (exciting, complex)
- Hexagonal architecture (interesting, patterns)
- Module Federation (pragmatic, boring)

**Which shipped most features?** Module Federation. **Which had least bugs?** Module Federation.

**What I learned:** Exciting architecture = exciting bugs. Boring architecture = boring predictable behavior.

PatientRecords is intentionally boring:
- REST API (not GraphQL)
- Observable pattern (not Redux)
- Single page app (not micro-frontends) - wait, that's a joke, but the core patterns are simple
- Deployment via Docker (industry standard)

Boring is good. Boring scales.

---

## Final Principles

### 21. You Are Solving an Organization Problem, Not a Technology Problem

The biggest mistake engineering leaders make: they frame problems as technical.

**"We need better testing"** → Actually "We're shipping bugs"
**"We need better monitoring"** → Actually "We're blind in production"
**"We need microservices"** → Actually "We can't deploy independently"

**Reframe every technical problem as an organizational problem first.**

Then the technical solution follows naturally.

### 22. Build for the Organization You Want, Not the One You Have Today

Best architecture decisions I've made were 6-12 months "too early."

**Pattern:**
- Current org: 30 engineers, monolith works
- Hire plan: 60 engineers
- Decision: Invest in Module Federation now

Result: Transition is smooth, not painful emergency.

**PatientRecords reflection:** Module Federation might be over-engineered today with single team. But if this is meant to show Principal/Staff-level thinking, it demonstrates capacity to build infrastructure for future, not today's problems.

### 23. The Best Teams Have Clear Constraints

Most creative work happens with constraints.

**Constraints that help:**
- "This module must be under 150KB"
- "Deployment must complete in <5 minutes"
- "All requests must respond in <500ms"

**Constraints that hurt:**
- "Use TypeScript everywhere"
- "All modules must use Angular"
- "No third-party dependencies"

Good constraints drive innovation. Bad constraints restrict it.

---

## What I'd Do Differently (Honest Assessment)

If I could go back 20 years:

1. **Build simpler longer.** I over-engineered for years. Monolith was better than I thought.

2. **Listen to the team more.** Best technical decisions came from listening to engineers, not from my planning.

3. **Focus on unblocking, not perfection.** Ship the 80% solution, not the 100% perfect design.

4. **Document decisions, not code.** The code I wrote 15 years ago is gone. The decision journals would have been valuable.

5. **Hire for culture fit earlier.** Many team problems were culture, not competence.

6. **Embrace simplicity as competitive advantage.** Complex rarely wins over simple.

---

**These lessons are embedded in PatientRecords design. See [ARCHITECTURE_LEADERSHIP.md](./ARCHITECTURE_LEADERSHIP.md) for how they apply to the specific project.**

