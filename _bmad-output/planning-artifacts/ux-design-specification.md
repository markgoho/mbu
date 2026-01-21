---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
workflowComplete: true
completionDate: 2026-01-21
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/analysis/brainstorming-session-2026-01-17.md'
project_name: mbu
user_name: Mark
date: 2026-01-20
---

# UX Design Specification mbu

**Author:** Mark
**Date:** 2026-01-20

---

## Executive Summary

### Project Vision

Merit Badge University (MBU) is reimagining how scouts discover and counselors teach Scouting America's 143 merit badges. Built on Hugo static site architecture, MBU provides fast, accessible, SEO-optimized merit badge information that works anywhere - including offline at camps with spotty connectivity. Phase 1 establishes the foundation through AI-powered metadata (difficulty ratings, skills tags, location requirements, time estimates) that enables intuitive taxonomy-based discovery, solving the "143 badges is overwhelming" problem while creating 50+ SEO landing pages for organic growth.

The project is brownfield enhancement of an existing Hugo site at merit-badge.university. While the site has 143 badge pages with requirements already live, the UX is not set in stone and can be reimagined to better serve users and support new features.

### Target Users

**Primary Audience: Scouts (ages 11-17)**
- Typically browsing alone (sometimes with parents, rarely with troop leaders)
- Facing discovery paralysis: 143+ diverse badges with no clear way to filter
- Mixed contexts: planning for summer camp, looking for weekend activities, or exploring long-term goals
- Need: Easy access to requirements + walkthroughs + explanations in a self-service experience
- Devices: Chromebooks (school/home) and iOS devices (personal)
- Environment: Mostly at home or troop meetings, but must work offline at camps

**Secondary Audience: Merit Badge Counselors (adults)**
- Traditional one-on-one teaching OR Merit Badge University group events (3-10 scouts)
- Pain point: Creating lesson plans from scratch for each badge - gathering materials, setting expectations, deciding prerequisites
- Currently tracking requirement changes manually via BSA documents
- Target for future premium content/monetization (Phase 2+)
- Need: Lesson planning tools + materials lists + time estimates

**Tertiary Audience: Parents**
- Supporting scouts with badge selection and planning
- Need simplified guidance and practical information

### Key Design Challenges

**Challenge 1: Discovery Paralysis & Choice Overload**
- 143+ badges create overwhelming choice for scouts
- Users have mixed contexts (planning ahead vs immediate vs exploring) requiring flexible navigation
- Solo browsing means self-service experience must be crystal clear without guidance
- Must make discovery intuitive and filtering natural through taxonomy system

**Challenge 2: Dual-Audience Content Strategy**
- Scouts need requirements + walkthroughs + explanations (learning mode)
- Counselors need lesson planning tools + materials lists + prerequisites (teaching mode)
- Same content, different mental models and use cases
- Must serve both without creating confusion or clutter

**Challenge 3: Offline-First for Camp Connectivity**
- Camps have spotty or no connectivity - must work offline
- Progressive web app capabilities required (service workers)
- Static site architecture provides foundation but needs offline strategy
- Badge pages must be fully accessible offline once cached

**Challenge 4: Information Density vs Mobile Clarity**
- Requirements can be complex and lengthy
- Must present dense information without overwhelming users
- Mobile-first constraint (limited screen space) makes this harder
- Balance completeness with scannability

### Design Opportunities

**Opportunity 1: Win Through Modern UX (Competitive Differentiation)**
- Competition (BSA.org, US Scouting Service Project, Boy Scout Trail) is "bland, slow, outdated, poor IA"
- Users explicitly want: better aesthetics, faster loading, updated information, better information architecture
- MBU can win purely on user experience quality
- Fast loading + beautiful design + intuitive navigation = immediate competitive advantage

**Opportunity 2: Taxonomy-Powered Multi-Path Discovery**
- Skills, difficulty, location, time tags solve the 143-badge overwhelm
- Multiple discovery paths: by interest, by constraint (indoor/outdoor), by time available
- SEO landing pages double as user-facing discovery tools
- Hugo taxonomy system provides both user value and technical elegance

**Opportunity 3: Counselor Lesson Planning Hub (Premium Future)**
- Counselors creating lesson plans from scratch is massive unaddressed pain point
- Foundation metadata (time estimates, difficulty, materials) enables lesson planning features
- Potential to become THE resource for counselor preparation
- Clear monetization path (Phase 2+)

**Opportunity 4: Progressive Enhancement Strategy**
- Start with fast, accessible static pages (establish trust)
- Layer on offline capability for camps (solve real problem)
- Add interactive features progressively (Phase 2+: comparison tools, quizzes, etc.)
- Build user loyalty through performance and reliability first

## Core User Experience

### Defining Experience

Merit Badge University serves two distinct core experiences built on the same badge content:

**Scout Core Experience: "Understanding Requirements"**
- Primary need: Clear, accessible understanding of what's required to earn a specific merit badge
- Context: Solo browsing, mixed goals (summer camp planning, weekend activities, long-term exploration)
- Success: When requirements are crystal clear and the scout understands how the badge fits their schedule and environment
- Behavioral modes:
  - **Eagle-required badges (13 of 17):** Optimization mindset - "which are easiest/fastest?" - emphasis on comparison
  - **Optional badges (120+ choices):** Exploration mindset - "which sounds fun/interesting?" - emphasis on inspiration

**Counselor Core Experience: "Guiding Scouts Through Badges"**
- Primary need: Understanding how to effectively guide scouts through earning a particular merit badge
- Context: Planning for one-on-one sessions or Merit Badge University group events (3-10 scouts)
- Success: When they have time estimates, materials lists, prerequisites, and a clear teaching plan
- Free-to-premium strategy: Basic planning tools free (builds trust), advanced lesson generation premium (conversion)

The UX must serve both audiences without creating confusion or clutter, using the same badge data but presenting different information hierarchies and entry points based on user intent.

### Platform Strategy

**Platform Foundation:**
- Responsive web application built on Hugo static site generator
- Works seamlessly on Chromebooks (keyboard/trackpad) and iOS devices (touch)
- No native app - web-based for universal access
- Desktop-optimized experiences permitted where beneficial:
  - Scout discovery: Mobile-optimized (thumb-friendly browsing)
  - Counselor planning: Desktop-optimized multi-column layouts (requirements | materials | timing visible simultaneously)

**Interaction Principles:**
- Full keyboard/mouse interaction parity (no hover-only interactions)
- Touch-optimized for mobile browsing
- Static page generation for sub-1-second page loads
- No runtime JavaScript dependencies for core content
- Modern browser APIs available (within no-login constraint)

**Performance Requirements:**
- Sub-1-second page load target (ideally)
- All content statically generated at build time
- No API calls or JavaScript execution required for core badge information
- Progressive enhancement for advanced features
- Performance watch areas:
  - Taxonomy pages listing 50+ badges (inline vs lazy load decision needed)
  - Full-text search index payload (143 badges × requirements text)

**Offline Strategy (Documented for Future PWA Conversion):**
- Not Phase 1, but architecture planned:
  - Service worker auto-caches badge pages on navigation
  - Pre-cache taxonomy landing pages on first site visit
  - Pre-cache search index (static asset)
  - Cache strategy: Network-first for changelogs, cache-first for badge content

**Account-Free Architecture Trade-offs:**
- No login required for core features maximizes reach
- Email signup only for counselor change notifications (opt-in)
- Premium lesson planning wizard can require interaction but not authentication
- "Save for later" bookmarks use browser localStorage (doesn't sync across devices - documented limitation)

### Effortless Interactions

**Discovery Must Feel Natural:**
- Browsing 143 badges without overwhelming choice paralysis
- Multiple discovery paths: by interest, by constraint (indoor/outdoor), by time available, by difficulty
- Instant navigation between related badges ("If you like Camping, try Hiking")
- Eagle-required badges visually distinguished from optional badges:
  - **Eagle-required:** Comparison features emphasized (difficulty, time, prerequisites side-by-side)
  - **Optional:** Inspiration features emphasized (cool factor, skill development, career connections)

**Information Architecture Rethinking:**
- **Current approach:** Requirements on subpage (anticipated many subpages per badge)
- **Proposed approach:** Badge landing page = Requirements page with contextual overlays/expandable sections for supplementary content
- **Rationale:** Requirements are THE core content scouts need - why hide behind a click?
- Deep linking already works, full-text search already works - leverage existing technical advantages
- Apply progressive disclosure: Not everything visible at once, but everything discoverable

**For Scouts - Understanding Without Friction:**
- Difficulty ratings, time estimates, and location requirements visible at a glance
- Every requirement has associated explainer/guidance (value-add layer)
- Visual formatting makes complex requirements scannable
- Clear indication of what's required vs what's helpful context
- "Bookmark/save for later" capability for scouts exploring multiple badges
- "Share with my patrol" social sharing for group coordination

**For Counselors - Planning Without Manual Work:**
- Time per requirement immediately scannable
- Materials lists, prerequisites clearly visible
- Visual indicators for badges that work well/poorly for group teaching
- Free tier: Time estimates + materials lists + difficulty ratings (builds trust, drives SEO traffic)
- Premium tier: "Help me plan this badge" wizard
  - Asks: number of scouts, course length (half-day, full-day, weekend, week-long summer camp), scout age range
  - Generates: Customized lesson plan with activities, timing, teaching scripts, age-adapted guidance
  - Server-rendered (not static), premium content, editable slide deck export

**Change Tracking Without Manual Checking:**
- Visual indicators on badge pages when requirements recently updated
- "What changed since last year" instantly visible without hunting
- Email notifications to counselors about requirement changes (opt-in)
- Per-badge changelog pages + global changelog

**Merit Badge Worksheets - Understanding the Job-to-be-Done:**
- Identified as expected resource by competitive analysis
- Why users want them: Tracking completion + artifact to turn in to counselor
- Strategic decision needed: Build traditional fillable PDFs OR create better digital solution?
- Explore whether interactive completion tracking (no login) provides more value than static worksheets

**Eliminate Competitor Friction:**
- No PDF downloads required to see requirements (show directly on page)
- No hunting through multiple pages to find basic badge information
- No separate mobile site or broken mobile experience
- No outdated aesthetic creating trust issues

### Critical Success Moments

**Scout First Impression (0-5 seconds):**
- Landing on homepage via Google search
- Clear, simple language explains what they'll find and how to use the site
- Modern aesthetic and mobile responsiveness immediately signal "this is better"
- Visual differentiation from outdated competitor sites creates instant trust
- **Success metric:** Bounce rate on taxonomy pages <40%

**Scout Discovery Success:**
- Realizing how badge requirements align with their interests
- Seeing difficulty and time commitment fit their schedule
- Understanding indoor/outdoor requirements match their environment
- Finding "the perfect badge" through intuitive filtering/browsing
- **Success metric:** Conversion from taxonomy page → badge page >30%

**Scout Requirement Clarity:**
- Seeing requirements broken down clearly with visual hierarchy
- Finding explainer/guidance for every requirement
- Understanding what's actually required vs supplemental information
- Deep linking allows sharing specific requirements with others
- **Success metric:** Time on badge page >2 minutes (indicates deep reading, not bounce)

**Scout Social Coordination:**
- Bookmarking badges for later consideration
- Sharing badge ideas with patrol members
- Comparing multiple badges side-by-side (especially Eagle-required)
- **Success metric:** Share button clicks + bookmark usage tracked

**Counselor Planning Confidence:**
- Seeing time estimates per requirement and overall badge
- Finding materials lists and suggested prerequisites
- Understanding which badges work well for group teaching
- Accessing lesson plan wizard for structured teaching plan
- **Success metric:** Return visitor rate for counselors >50% (indicates repeat usage)

**Counselor Change Awareness:**
- Returning to badge they've taught before
- Immediately seeing "Requirements updated" indicator
- Accessing before/after comparison on changelog page
- Receiving email notification about changes (if subscribed)
- **Success metric:** Changelog page visits as % of badge page traffic >5%

**General "Aha" Moments:**
- Modern design + mobile responsiveness (key differentiator)
- Deep linking to specific requirements (technical advantage)
- Full-text search across requirements (functionality competitors lack)
- Fast page loads creating friction-free browsing experience
- **Success metric:** Lighthouse Performance score >90, FCP <1s

### Experience Principles

These principles guide all UX design decisions for Merit Badge University:

**1. "Instant Clarity Over Everything"**
- Sub-1-second page loads are non-negotiable
- Requirements must be front and center, no hunting required
- If users can't find what they need immediately, they'll bounce back to competitors
- Static generation ensures speed; progressive enhancement for advanced features

**2. "Mobile-First Modern Beats Feature-Rich Outdated"**
- Simply being responsive and visually modern is the competitive moat
- Aesthetic quality and mobile usability win before advanced features matter
- Outdated competitors create opportunity through design alone
- Modern ≠ trendy; modern = clean, fast, accessible, trustworthy

**3. "Discovery Is Our Moat"**
- Taxonomy system, filtering, and multi-path navigation are the strategic differentiator
- Not just better design - fundamentally better way to explore 143 badges
- Competitors offer lists; we offer curated discovery paths
- Every taxonomy page is both SEO landing page AND user-facing discovery tool
- This is the sustainable competitive advantage, not aesthetics alone

**4. "Progressive Disclosure for Mobile Clarity"**
- Not everything needs to be visible at once, but everything must be discoverable
- Mobile-first doesn't mean cramming everything above the fold
- Smart information hierarchy: Show critical info, reveal details on demand
- Expandable sections, contextual overlays, and thoughtful layering

**5. "Same Content, Different Lenses"**
- Scouts need discovery + understanding (learning mode)
- Counselors need planning + change tracking (teaching mode)
- Same badge data, different information hierarchy and entry points
- Serve both audiences without creating confusion or clutter

**6. "Requirements Are Sacred, Guidance Is Our Value"**
- Never alter BSA requirements (maintain accuracy and trust)
- Value-add layer: explainers, time estimates, difficulty ratings, contextual guidance
- Requirements are read-only; understanding is what we provide
- Authority through accuracy + helpfulness through context

**7. "No Login Friction for Core Value"**
- Full badge information accessible without accounts
- Email signup only for counselor change notifications and future premium features
- Premium lesson planning can require interaction but not authentication
- Maximize reach by eliminating barriers to core content
- Accept localStorage limitations for bookmark sync as acceptable trade-off

**8. "Eagle-Required vs Optional = Different Mental Models"**
- Must-do badges (Eagle-required, 13 of 17) represent optimization mindset
- Optional badges (120+ choices) represent exploration and interest-driven discovery
- Visual treatment and feature emphasis must reflect this psychological difference:
  - Eagle-required: Emphasize comparison (difficulty, time, prerequisites side-by-side)
  - Optional: Emphasize inspiration (cool factor, skill development, career paths)

**9. "Free Builds Trust, Premium Delivers Value"**
- Free tier: Planning fundamentals (time estimates, materials, difficulty) - builds counselor trust
- Premium tier: Generated lesson plans, age-adapted guidance, editable resources
- Free tier drives SEO traffic and establishes authority
- Premium tier captures willingness-to-pay from counselors with immediate needs

## Desired Emotional Response

### Primary Emotional Goals

**"Be Prepared" - The Scout Motto as Emotional Foundation**

Merit Badge University's core emotional goal is to make users feel **prepared** - confident, ready, and equipped to succeed. This aligns perfectly with the Scout motto and creates an emotional throughline across all interactions.

**For Scouts:**
- **Primary emotion:** Prepared and confident (not overwhelmed or uncertain)
- **Discovery emotion:** "I landed in the right place - this site will help me navigate the merit badge system"
- **Decision-making emotion:** Confidence they're making good choices
- **Post-understanding emotion:** "I can do this badge" - confidence and excitement about capability

**For Counselors:**
- **Primary emotion:** Confident in their teaching ability and prepared to succeed
- **Deeper motivation:** "Help scouts succeed" (altruistic) and "Look like a competent counselor" (professional reputation)
- **Planning emotion:** Reassurance they have what they need
- **Post-planning emotion:** Relief from accomplishing complex work quickly (3 hours → 3 minutes)

**Note on Dual-Audience Emotional Strategy:**
While "Be Prepared" resonates strongly with scouts (it's THE motto) and parents, counselors may connect more with "helping scouts succeed" and professional competence. The emotional foundation remains the same (confidence, clarity, preparedness), but the framing varies slightly by audience.

**Shareability Factor:**
The emotion that drives word-of-mouth: **Discovery delight** - "Whoa, I didn't know this existed, and it's so helpful!"

**Competitive Differentiation Through Emotion:**
- **Competitors create:** Overwhelm, uncertainty, fatigue
- **MBU creates:** Clarity, confidence, energy

**Explicit Emotional Messaging:**
Don't just design for these emotions - message them explicitly so users know what they're getting:
- "Finally, merit badges that make sense" (clarity vs overwhelm)
- "Find the right badge in seconds, not hours" (efficiency vs fatigue)
- "Know exactly what you're getting into" (confidence vs uncertainty)

### Emotional Journey Mapping

**Scout Emotional Journey:**

1. **Discovery Moment (Landing on Site)**
   - Desired emotion: "I'm in the right place" - immediate recognition and welcome
   - Design support: Clear, simple language; modern aesthetic creates trust; obvious navigation
   - **Delight moment:** First impression of modern design vs outdated competitors

2. **Browsing/Filtering (Taxonomy Pages)**
   - Desired emotion: "I'm making good decisions" - empowered by information
   - Design support: Clear filtering options, visible metadata (difficulty, time, location), manageable subsets
   - **Delight moment:** Finding the perfect badge instantly through intuitive taxonomy filtering

3. **Reading Requirements (Badge Page)**
   - Desired emotion: "This is clear, not overwhelming" - manageable complexity
   - Design support: Visual hierarchy, progressive disclosure, scannable formatting

4. **Understanding Accomplishment**
   - Desired emotion: **"Wave of understanding"** - clarity replacing confusion
   - Design support: Explainers/guidance on every requirement, contextual help
   - **Delight moment:** First time a requirement explainer makes something click
   - **Interaction patterns for "wave of understanding":**
     - Expandable explainer sections (click/tap to reveal) - works offline, accessible
     - Inline contextual help icons - progressive enhancement with tooltips
     - Visual diagrams embedded in requirements where helpful
     - Clear "What this means" explanations in plain language

5. **Post-Badge Selection**
   - Desired emotion: "I'm confident I can do this" - readiness and capability (NOT relief, which implies prior anxiety)
   - Design support: Clear requirements, realistic time estimates, visible difficulty ratings
   - Emotional reframe: Confidence and excitement about capability, not relief from stress

6. **When Badge Seems Wrong/Too Hard (Never Stuck Moment)**
   - Desired emotion: **Empowered with clear next steps** - never at a dead end
   - Design support - **Specific escape hatches:**
     - "See easier badges" button prominently displayed if difficulty is 4-5
     - Related badge suggestions with difficulty shown: "If you like Astronomy, try..." (with difficulty stars visible)
     - "Badges similar to [this badge]" automated recommendations based on skills tags
     - "Back to [skill] badges" breadcrumb navigation
     - Persistent search bar for alternative discovery path
   - **Technical requirement:** ALL escape hatches must work, not just some - this is an emotional promise

**Counselor Emotional Journey:**

1. **Planning Phase**
   - Desired emotion: Confident and reassured about teaching ability
   - Design support: Time estimates per requirement, materials lists visible, prerequisites clear

2. **Lesson Plan Generation**
   - Desired emotion: Relief from getting complex work done quickly (appropriate here - counselors KNOW planning is painful)
   - Design support: Fast wizard, immediate results, comprehensive output
   - **Delight moment:** Seeing the lesson plan wizard output for the first time - hours of work done in seconds

3. **Change Awareness**
   - Desired emotion: Trust and confidence in staying current
   - Design support: Visual change indicators, clear before/after comparisons

**Universal Journey Moments:**

4. **When Search Fails or Path is Unclear**
   - Desired emotion: **Never stuck** - always empowered with multiple paths
   - Design support: Related badge suggestions, alternative discovery paths, clear navigation
   - **Specific escape hatches:** If search returns no results, suggest browsing by skills, location, or difficulty

5. **Returning to Site**
   - Desired emotion: Familiarity and trust - "this continues to help me"
   - Design support: Bookmarks persist (localStorage), consistent experience, new content discoverable

### Micro-Emotions

**Critical Emotional States:**

**Confidence vs. Confusion**
- Target: Confidence through clarity, not confusion from information overload
- Achieved through: Clear visual hierarchy, progressive disclosure, explainers/guidance
- "Be Prepared" feeling = confident and ready

**Trust vs. Skepticism**
- Target: Immediate trust in accuracy and professionalism
- Achieved through: Modern design, accurate BSA requirements, "Aligned with BSA standards" badges
- Competitive advantage: Competitors' outdated aesthetic creates skepticism
- **Shared across both audiences** - trust is foundational

**Clarity vs. Overwhelm**
- Target: Clarity and manageability (key differentiator from competitors)
- Achieved through: Taxonomy filtering, progressive disclosure, visual formatting
- Scouts: Requirements clear, not buried or confusing
- Counselors: Planning clear, not starting from scratch
- **Shared across both audiences** - clarity is core to experience

**Empowerment vs. Helplessness**
- Target: Empowerment through multiple paths and information access
- Achieved through: Multiple discovery paths, related badge suggestions, clear navigation
- "Never stuck" - always empowered to find another way
- "Making good decisions" - empowered by information
- **Technical promise:** Robust taxonomy + search + related suggestions all working

**Accomplishment vs. Frustration**
- Target: Accomplishment through understanding and efficiency
- Achieved through: "Wave of understanding" moments, relief from quick work completion (counselors)
- Explainers transform confusion into clarity
- Lesson plan wizard transforms hours of work into minutes

**Excitement vs. Anxiety**
- Target: Excitement about possibilities (optional badges), anxiety reduction (Eagle-required)
- Achieved through: Optional badges emphasize inspiration; Eagle-required emphasize comparison/planning
- Discovery creates excitement, not anxiety about wrong choices
- Scouts: Confidence and excitement (not relief) - reframed to avoid implying badge stress

**Emotional Consistency Framework:**
- **Shared emotional core** (both audiences): Modern = trust, Fast = respect, Clear = confidence
- **Audience-specific emotional accents:**
  - Scouts: Excitement about possibilities, confidence in capability
  - Counselors: Relief from efficiency, confidence in teaching ability

### Design Implications

**Emotion-to-Design Connections:**

**To Create "Confidence" and "Be Prepared":**
- Show difficulty ratings, time estimates, materials upfront → eliminates surprises
- Clear visual hierarchy in requirements → easy to scan and understand
- Metadata visible at a glance → informed decision-making
- Realistic expectations set early → no disappointment later

**To Create "Wave of Understanding" (Clarity Moment):**
- **Interaction Pattern:** Expandable explainer sections (primary method)
  - Click/tap to reveal detailed guidance below each requirement
  - Works without JavaScript (progressive enhancement)
  - Accessible via keyboard navigation
  - Works offline (future PWA)
- **Supplemental Pattern:** Inline help icons with tooltips (secondary)
  - Progressive enhancement - works with or without JS
  - Quick contextual hints on hover/tap
- Visual formatting of complex requirements → immediate comprehension
- Progressive disclosure → reveals complexity gradually, not all at once
- Plain language "What this means" explanations
- **Delight moment is architected:** First explainer reveals = "aha!" moment by design

**To Create "Relief" (Efficiency - Counselors Only):**
- Sub-1-second page loads → no waiting, instant gratification (technically validated via Hugo static generation)
- Information immediately visible → no clicking through multiple pages
- Requirements as landing page → one less click to core content
- Lesson plan wizard generates in seconds → hours of work saved
- Fast = respectful of user time = relief
- **Delight moment:** Wizard output quality exceeds expectations

**To Create "Confidence and Excitement" (Scouts):**
- Difficulty ratings create realistic self-assessment → "I can do this level"
- Time estimates set clear expectations → manageable commitment
- Skills tags show what they'll learn → excitement about growth
- Visual indicators (stars, badges, icons) make scanning fun
- Clear requirements without overwhelm → confidence builds naturally

**To Create "Trust" (Authority and Accuracy):**
- Modern aesthetic → professional and current, not outdated (both audiences)
- "Aligned with BSA standards" visual badges → explicit authority
- Accurate requirements matching BSA sources → reliability
- Last updated dates → transparency about freshness
- Fast performance → signals quality and care (technically validated)
- **Shared foundation** across scouts and counselors

**To Create "Never Stuck" (Empowerment):**
- **Concrete escape hatches (all must work - technical requirement):**
  - "See easier badges" button when viewing difficulty 4-5
  - Related badge suggestions with difficulty visible
  - "Badges similar to [name]" automated recommendations
  - "Back to [taxonomy]" breadcrumb navigation
  - Persistent search bar always available
  - "Browse by [skill/location/difficulty]" alternative paths
- Multiple discovery paths → taxonomy, search, related badges, skills, location
- Clear navigation and breadcrumbs → always know where you are
- No dead ends → every page offers next steps
- **Architectural requirement:** Robust taxonomy + search + suggestions all functioning

**To Avoid "Overwhelm" (Manage Cognitive Load):**
- Progressive disclosure → not everything visible at once
- Taxonomy filtering → manageable subsets, not all 143 badges at once
- Visual chunking → group related information
- White space → breathing room prevents density fatigue
- Mobile-first constraints → forces prioritization of essential information

**To Create "Making Good Decisions" (Informed Choice):**
- Comparison features for Eagle-required badges → side-by-side evaluation
- Difficulty and time visible on list pages → pre-filtering before deep dive
- Skills tags → understand what badge develops
- Location requirements → practical constraint filtering

**Architected Delight Moments (Not Accidental):**
1. **First impression:** Modern design vs outdated competitors (immediate)
2. **First filter use:** Finding perfect badge instantly via taxonomy (discovery)
3. **First explainer:** Requirement clicks into place with guidance (understanding)
4. **First lesson plan:** Wizard output quality amazes counselor (efficiency)
5. **Deep linking share:** Sending exact requirement to friend works perfectly (utility)

### Emotional Design Principles

**1. "Clarity Is Kindness"**
- Confusion creates anxiety; clarity creates confidence
- Never hide information users need behind unnecessary clicks
- Progressive disclosure when appropriate, but requirements always accessible
- Every design decision should ask: "Does this create clarity or confusion?"

**2. "Fast Feels Respectful"**
- Speed signals quality and respect for user time
- Sub-1-second loads create positive emotion, not frustration
- Efficiency creates confidence for scouts, relief for counselors
- Performance is an emotional experience, not just a technical metric
- **Technically validated:** Hugo static generation achieves this goal

**3. "Multiple Paths = Never Stuck"**
- Empowerment comes from options, not single paths
- Every user should find their preferred way to discover badges
- Related suggestions, taxonomy navigation, search - always alternatives
- Dead ends create helplessness; connections create empowerment
- **This is an emotional promise requiring technical delivery:** ALL escape hatches must work

**4. "Trust Through Modern + Accurate"**
- Modern design = current and trustworthy (not outdated = questionable)
- Accurate BSA requirements = authority and reliability
- Visual signals of quality (fast, clean, accessible) build instant trust
- Trust is the foundation for all other positive emotions
- **Shared across both audiences** - foundational emotional core

**5. "Prepare, Don't Surprise"**
- The Scout motto guides emotional strategy
- Show difficulty, time, materials early - no hidden complexity
- Set realistic expectations immediately
- Preparation creates confidence; surprises create anxiety

**6. "Understanding Is Achievement"**
- "Wave of understanding" is a success moment to design for
- Explainers and guidance create accomplishment feelings
- Confusion → clarity = emotional win worth celebrating
- Every requirement with guidance = opportunity for understanding achievement
- **Interaction pattern defined:** Expandable sections create the "aha" moment

**7. "Relief Through Efficiency (Counselors)"**
- Accomplishing complex work quickly creates positive emotion
- Lesson plan wizard: 3 hours → 3 minutes = relief and gratitude
- Information immediately accessible = no hunting frustration
- Efficiency is an emotional benefit, not just a functional one
- **For scouts:** Reframe as confidence and excitement, not relief (avoids implying stress)

**8. "Shared Core + Audience Accents"**
- Maintain emotional consistency across dual audiences
- **Shared emotional foundation:** Modern = trust, Fast = respect, Clear = confidence
- **Audience-specific accents:** Scouts = excitement/confidence, Counselors = relief/competence
- Don't diverge so much it feels like two different products

**9. "Familiarity Without Exploitation"**
- Scouts know how to use TikTok, YouTube, Khan Academy, and Snapchat
- Leverage that familiarity (visual cards, search, recommendations, clean educational interfaces)
- WITHOUT exploiting their vulnerabilities (infinite scroll, notifications, FOMO, competitive metrics)
- This is the bridge between their digital fluency and our ethical mission

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

**Scout Digital Experience Context:**

Scouts (ages 11-17) primarily use social/entertainment apps for communication and content discovery:
- **Discord, Snapchat, TikTok, Character.AI** - Used for social connection and communication with friends
- **Khan Academy, Mia Academy** - Educational platforms (required for homeschooling, not necessarily loved)
- **YouTube** - Both educational and entertainment, consumed in both short-form and long-form

**Key Insight:** Scouts' digital fluency comes from social/entertainment apps, not educational sites. Merit Badge University must bridge this gap - leveraging familiar interaction patterns from social apps while serving as an educational reference resource.

**Educational Reference Point: Khan Academy**

While scouts may not "love" Khan Academy, they're FAMILIAR with it. Transferable patterns:
- **Mastery-based content organization** - clear progression through topics
- **Video + text hybrid approach** - multiple content formats for different learning styles
- **"You can learn anything" empowering messaging** - aligns with "Be Prepared" emotional foundation
- **Progress indicators** - clear sense of where you are (though MBU won't track progress - that's Scoutbook's job)
- **Clean, distraction-free interface** - content-first design

Familiarity matters even when apps aren't loved - scouts already understand how to navigate educational content in this format.

**Counselor Digital Experience Context:**

Counselors likely use varied productivity and planning tools:
- **Google Docs** - collaborative document creation
- **Email, Facebook groups** - communication and coordination
- **Potential education tools:** Canva (presentations), Pinterest (ideas gathering), Teachers Pay Teachers (lesson materials)
- **PDF exports** - portable, printable lesson plans and materials
- Desktop-first workflows for planning activities

**Note:** Counselor tool ecosystem is diverse - MBU should provide flexible export formats (PDF likely) rather than trying to replicate specific tools.

**YouTube as Quality Indicator:**

"Good videos are measured by watch time" - scouts engage deeply with content they find valuable, whether short-form or long-form. This maps directly to MBU's success metric: **time on page >2 minutes indicates deep reading and engagement**, not just bouncing.

**Actionable metric using Pirsch:** Track average time on page per badge. If camping merit badge averages 4 minutes but astronomy averages 30 seconds, investigate content quality or badge presentation. Use this data to IMPROVE content, not to manipulate engagement.

**Popularity-Based Discovery Mental Model:**

Scouts rely on content recommendations to expose them to new material (TikTok For You page, YouTube recommendations, Discord server discovery). They don't actively search as much as they browse recommended content. 

**Important distinction:** This is **popularity-based discovery** (aggregate data showing what's trending across all users), NOT personalized algorithms (based on individual behavior). No personalization = no filter bubble, no privacy concerns, no creepy tracking. This is a feature, not a limitation.

**Future Enhancement (Post-Phase 1):**
- "Trending badges this week" using Pirsch analytics API
- "Popular badges" based on aggregate visitor patterns
- "Seasonal recommendations" (summer camp badges, winter indoor badges)
- Related badge recommendations based on skills/interests

**Technical approach:** Daily pre-computed trending data via scheduled GitHub Action (fetches Pirsch analytics, calculates top badges, updates static JSON, rebuilds site). Maintains static architecture while providing daily-fresh popularity data.

**Current Priority:** Low priority due to current low traffic levels. Pattern documented for future implementation.

**Visual vs Textual Design Direction:**

Clear split based on audience needs, but with architectural clarity:

**Shared Content (Same for Both Audiences):**
- Badge requirements pages - both scouts and counselors see identical requirements text
- Metadata (difficulty, time, location, skills) - visible to both audiences
- Core badge information - shared foundation

**Audience-Specific Supplementary Pages:**
- **For Scouts:** "Explain These Requirements" page - highly visual with diagrams, photos, explainer graphics
- **For Counselors:** "Help Me Plan to Teach This Merit Badge" page - text-heavy with materials lists, timing breakdowns, teaching notes, PDF export

**Visual Treatment Differences:**
- **Scout browsing experience:** Visual-first badge cards, icons, stars, photos, quick scanning, mobile-optimized
- **Counselor planning experience:** Textual detail with tables, lists, planning information, desktop-friendly layouts, PDF export capability


### Transferable UX Patterns

**Pattern 1: Popularity-Based Discovery (from TikTok, YouTube)**
- **What it is:** Content recommendations based on aggregate user behavior and patterns
- **How MBU adapts it:** "Trending badges this week," "Most popular badges," "Popular for summer camp" (future enhancement)
- **Technical implementation:** Daily pre-computed via GitHub Action fetching Pirsch analytics API, updates static JSON, maintains static site architecture
- **Why it works:** Leverages scouts' mental model of content discovery without requiring accounts or personalization
- **Design implication:** Prominent "Trending" and "Popular" sections on homepage and taxonomy pages (when traffic warrants)
- **Ethical consideration:** No personalized filter bubbles - same trending content shown to everyone, privacy-friendly aggregate data only
- **Current status:** Low priority due to low current traffic, pattern documented for future

**Pattern 2: Visual-First Scout Browsing Experience (from TikTok, YouTube, Snapchat)**
- **What it is:** Visual cards/thumbnails with key metadata, optimized for quick scanning
- **How MBU adapts it:** Badge cards with:
  - Badge images (created using Gemini Nano - already complete)
  - Difficulty as visual stars: ⭐⭐⭐ (not just text "Moderate")
  - Time estimate as icon + number: "⏱️ 8-10 hrs"
  - Location as icon: 🏠 Indoor / 🏕️ Outdoor / ↔️ Flexible
  - Skills as small badge pills: Leadership, STEM, Outdoor Skills
- **Why it works:** Scouts are trained to scan visual content quickly on mobile devices
- **Design implication:** Card-based layouts for badge lists, visual indicators prioritized over text labels
- **Asset source:** Gemini Nano-generated badge images already created (solved)

**Pattern 3: Instant Results Expectation (from All Social Apps)**
- **What it is:** Search and navigation feel instantaneous, no loading states or delays
- **How MBU adapts it:** Sub-1-second page loads via Hugo static generation, instant search results
- **Why it works:** Speed signals quality and respect for user time (already validated as emotional principle)
- **Design implication:** Performance is non-negotiable - any lag feels broken to this audience
- **Technical validation:** Architecturally achievable for all static pages, search (if pre-loaded JS index ~500KB), taxonomy pages

**Pattern 4: Simple, Focused Navigation (from Current MBU Philosophy)**
- **What it is:** Minimal navigation options, clear primary actions, no overwhelming menus
- **Current MBU navigation:** "View Merit Badges" and "Search" on mobile
- **Why it works:** Reduces cognitive load, keeps focus on content discovery
- **Design implication:** Resist feature creep in navigation, iterate carefully over time
- **Mobile approach:** Web-native sticky search/filters at top (not bottom app-style tabs), easier to implement and more familiar for web browsing

**Pattern 5: YouTube Search + Recommendations Hybrid**
- **What it is:** Users can search explicitly OR rely on recommendations, both paths work well
- **How MBU adapts it:** Full-text search across all badge requirements + related badge suggestions + taxonomy discovery
- **Why it works:** Supports both "I know what I'm looking for" and "show me what's interesting" modes
- **Design implication:** Search bar always visible + related badges on every page + taxonomy landing pages

**Pattern 6: Short-Form Overview + Long-Form Deep Dive (from YouTube)**
- **What it is:** Quick preview content leads to optional deep engagement
- **How MBU adapts it:** Badge list pages show summary info (difficulty, time, location), badge detail pages provide complete requirements and explainers
- **Why it works:** Respects both "quick scan" and "deep read" user modes
- **Design implication:** Progressive disclosure - don't force all information upfront, but make it easily accessible

**Pattern 7: Social Proof Without Competition (from YouTube view counts, adapted ethically)**
- **What it is:** Aggregate popularity signals guide discovery without creating competitive pressure
- **How MBU adapts it:** "Popular this week" text badge indicator (NO numbers), "Community favorite" indicators, "Seasonal picks" curated lists
- **Why it works:** Privacy-friendly, leverages familiar "this is popular" signal without FOMO or competition
- **Design implication:** Display popularity indicators WITHOUT view counts or competitive framing
- **Ethical framing:**
  - ✅ "Trending this week" text badge (no numbers)
  - ✅ "Community favorite" indicator (social proof without competition)
  - ✅ "Seasonal picks" curated by humans (editorial + data hybrid)
  - ❌ "🔥 1,247 scouts viewed this week!" (creates FOMO, competitive pressure)
  - ❌ View counts visible (creates popularity contest)
  - ❌ "Most completed badge" competitive framing

**Pattern 8: Related Content Recommendations (from YouTube, TikTok)**
- **What it is:** "If you liked this, you might like..." suggestions based on content similarity
- **How MBU adapts it:** "If you like Camping, try Hiking" based on skills tags and metadata similarity
- **Why it works:** Keeps users exploring without feeling lost, creates discovery moments
- **Design implication:** Related badge section on every badge page with difficulty ratings visible, limited to 3-5 suggestions (not endless)
- **Technical implementation:** Pre-computed at build time based on skills similarity, no runtime calculation

**Pattern 9: Khan Academy Educational Interface Patterns**
- **What it is:** Clean, distraction-free educational content presentation with clear organization
- **How MBU adapts it:**
  - Mastery-based content hierarchy (requirements organized logically)
  - Video + text hybrid approach (explainer graphics + written guidance)
  - Empowering messaging aligned with "Be Prepared" emotional foundation
  - Clean, content-first interface without distractions
- **Why it works:** Scouts are familiar with this educational content format even if they don't love it
- **Design implication:** Familiarity reduces friction - leverage known patterns from educational platforms

**Pattern 10: Time on Page as Quality Metric (from YouTube watch time)**
- **What it is:** Engagement measured by time spent, not clicks or views
- **How MBU adapts it:** Use Pirsch to track average time on page per badge as quality indicator
- **Why it works:** >2 minutes indicates deep reading and genuine engagement, not bounce
- **Design implication:** Use metrics to IMPROVE content quality, not to manipulate engagement
- **Actionable insight:** If camping badge averages 4 min but astronomy averages 30 sec, investigate content presentation or badge interest


### Anti-Patterns to Avoid

**Understanding the Source:**
The apps scouts use (Discord, Snapchat, TikTok, Character.AI) are engaging primarily due to their **addictive nature**, not excellent UX. These apps are designed for maximum engagement through psychological manipulation. Merit Badge University must explicitly avoid these patterns to remain ethical and aligned with Scouting values.

**Anti-Pattern 1: Infinite Scroll**
- **Why it's addictive:** Removes natural stopping points, encourages mindless consumption
- **Why MBU avoids it:** Scouts should feel in control, not trapped in endless browsing
- **MBU alternative:** Pagination with clear page numbers, or "Load more" buttons with visible endpoints
- **Emotional alignment:** Supports "Be Prepared" and "Never Stuck" principles - users always know where they are

**Anti-Pattern 2: Notification Manipulation**
- **Why it's addictive:** Creates FOMO (fear of missing out), interrupts focus, demands attention
- **Why MBU avoids it:** Educational resource shouldn't interrupt scouts' lives
- **MBU alternative:** Email opt-in only for counselor change notifications, no push notifications for core features
- **Emotional alignment:** Respects user time and attention, no manipulation

**Anti-Pattern 3: FOMO Mechanics (Limited Time, Artificial Scarcity)**
- **Why it's addictive:** Creates urgency and anxiety to drive engagement
- **Why MBU avoids it:** Badge requirements don't change frequently, no reason for artificial urgency
- **MBU alternative:** Honest "Requirements updated" indicators, no countdown timers or "limited time" badges
- **Emotional alignment:** "Prepare, Don't Surprise" principle - clarity over manipulation

**Anti-Pattern 4: Autoplay / Auto-Advance**
- **Why it's addictive:** Removes user agency, keeps engagement going without conscious choice
- **Why MBU avoids it:** Scouts should consciously choose which badges to explore
- **MBU alternative:** Explicit navigation required, related suggestions offered but not forced
- **Emotional alignment:** Empowerment over helplessness - user always in control

**Anti-Pattern 5: Engagement Gamification (Streaks, Time Spent Metrics)**
- **Why it's addictive:** Creates guilt/obligation to maintain arbitrary metrics
- **Why MBU avoids it:** Badge completion tracked in Scoutbook (not our job), no need for artificial engagement metrics
- **MBU alternative:** Focus on information quality and helpfulness, not engagement manipulation
- **Emotional alignment:** "Clarity Is Kindness" - no guilt trips or psychological manipulation

**Anti-Pattern 6: Endless Content Rabbit Holes**
- **Why it's addictive:** Each piece of content leads to 10 more, no clear path forward
- **Why MBU avoids it:** Scouts should find the right badge and get to work, not browse forever
- **MBU alternative:** Related suggestions are relevant and limited (3-5 badges), not endless
- **Emotional alignment:** "Instant Clarity Over Everything" - help users find what they need and move on

**Anti-Pattern 7: Competitive Popularity Metrics**
- **Why it's addictive:** Creates social pressure, FOMO, and popularity contests
- **Why MBU avoids it:** Scouting is about personal growth, not competition for badge views
- **MBU alternative:** "Popular this week" indicators without numbers, "Community favorite" without rankings
- **Emotional alignment:** Ethical design respects individual choice over social pressure


### Design Inspiration Strategy

**What to Adopt (Familiar Patterns Without Manipulation):**

1. **Popularity-Based Discovery Model** - "Trending" and "Popular" badges using Pirsch analytics (future enhancement)
   - Leverages familiar mental model from TikTok/YouTube
   - Privacy-friendly (aggregate data only, no personalization)
   - Creates discovery without requiring accounts
   - Supports both scouts and counselors finding relevant badges
   - Technical: Daily pre-compute via GitHub Action maintains static architecture

2. **Visual-First Scout Browsing Experience** - Card-based layouts, icons, stars, photos
   - Badge images already created using Gemini Nano
   - Visual metadata: ⭐ difficulty, ⏱️ time, 🏠/🏕️ location, skill pills
   - Aligns with TikTok/YouTube visual scanning habits
   - Quick comprehension on mobile devices

3. **Instant Results Expectation** - Sub-1-second loads, instant search
   - Table stakes for this audience
   - Technical architecture (Hugo static generation) supports this
   - Speed = quality signal
   - Architecturally validated as achievable

4. **Simple, Focused Navigation** - Minimal options, clear primary actions
   - Current approach: "View Merit Badges" and "Search"
   - Web-native sticky search/filters at top (not app-style bottom nav)
   - Iterate carefully over time, resist navigation bloat

5. **YouTube-Style Hybrid Discovery** - Search + recommendations + curated paths
   - Supports both explicit search and passive discovery
   - "Never Stuck" principle - multiple ways to find badges
   - Related suggestions limited to 3-5 badges (not endless)

6. **Educational Interface Familiarity** - Khan Academy-style clean, content-first design
   - Scouts already understand this format from homeschooling
   - Distraction-free, clear hierarchy, empowering messaging
   - Leverage familiarity even if not loved

**What to Adapt (Modify for Educational Context):**

1. **Social Proof Signals** - Adapt view counts/popularity from YouTube ethically
   - Show "Most popular badges" WITHOUT numbers or competition
   - Use as discovery tool, not engagement manipulation
   - "Community favorite" and "Seasonal picks" framing
   - No leaderboards or comparison mechanics

2. **Short-to-Long Content Flow** - Adapt YouTube preview → full video pattern
   - Badge list pages = quick preview (like YouTube thumbnails)
   - Badge detail pages = deep content (like full video)
   - Progressive disclosure without autoplay

3. **Related Content Suggestions** - Adapt "recommended videos" pattern
   - Limit to 3-5 related badges (not endless)
   - Based on skills/difficulty/location similarity
   - Help discovery without creating rabbit holes

4. **Time on Page as Quality Metric** - Adapt YouTube watch time analytics
   - Use Pirsch to measure avg time per badge
   - Improve content quality based on data
   - Don't manipulate for higher engagement

**What to Avoid (Addictive Patterns):**

1. **Infinite Scroll** - Use pagination or explicit "Load more" buttons
2. **Notification Manipulation** - Email opt-in only, no push notifications
3. **FOMO Mechanics** - No artificial urgency or scarcity
4. **Autoplay** - No auto-advancing content
5. **Engagement Gamification** - No streaks, time spent metrics, or guilt trips
6. **Endless Rabbit Holes** - Limited, relevant related suggestions only
7. **Competitive Metrics** - No view counts, rankings, or popularity contests

**Strategic Positioning: Ethical Design as Competitive Advantage**

Merit Badge University positions itself in the **"ethical design" / "humane tech"** category by explicitly rejecting addictive patterns. This is strategically smart:
- Growing parent concern about screen time and app addiction (especially for ages 11-17)
- Scouting America's values (trustworthy, helpful, friendly, kind) align with ethical tech
- Differentiator in crowded education space

**Market positioning opportunity:** "The merit badge resource that respects scouts' time and attention."

**When implementing trending/popular badges (post-Phase 1):** Announce as "Community Trending - powered by real scout interest, not algorithms." Marketing this as a feature reinforces ethical positioning.

**Strategic Reasoning:**

Merit Badge University must bridge two worlds:
- **Leverage familiar patterns** from social apps scouts already use (visual cards, trending content, instant results, simple navigation, mobile-first)
- **Reject addictive mechanics** that conflict with Scouting values and educational mission (no manipulation, no FOMO, no engagement traps, no competitive pressure)

The goal is **ethical engagement through usefulness**, not psychological manipulation. Scouts should visit MBU because it helps them prepare and succeed with merit badges, not because they're addicted to dopamine loops.

**Alignment with Emotional Principles:**
- "Be Prepared" > Addictive engagement
- "Clarity Is Kindness" > Manipulative dark patterns
- "Never Stuck" > Infinite scroll traps
- "Trust Through Modern + Accurate" > Honest, transparent design
- "Shared Core + Audience Accents" > Respectful of both scouts and counselors
- "Familiarity Without Exploitation" > Bridge between digital fluency and ethical mission

This strategy honors scouts' digital fluency while respecting their agency and supporting their educational goals. It positions MBU as the ethical alternative in merit badge resources - fast, modern, and helpful WITHOUT being manipulative.

**Technical Note on PDF Export (Counselor Tools):**
Approach: Use browser print functionality (Google Docs save to PDF approach) or similar. Provides flexible, portable lesson plans without requiring server-side PDF generation. Aligns with static-first philosophy.


## Design System Foundation

### Design System Approach

**Custom Component-First System**

Merit Badge University uses a custom design system built on Hugo partials and modern native CSS, optimized for sub-1-second page loads and visual differentiation from outdated competitors.

**Foundation Already in Place:**
- Modern native CSS with custom properties (`:root` variables, no SCSS variables)
- SCSS used only for file organization and imports (not for variables, mixins, or functions)
- Component-based SCSS architecture (import only what each page needs)
- Andy Bell's Modern CSS Reset as baseline
- Progressive enhancement with oklch color space (HSL fallback for older browsers)
- Fluid typography and spacing using clamp() with container query units
- Container queries for context-aware responsive design
- View transitions API for smooth page navigation
- CSS nesting (native, not SCSS)

**Technical Sophistication Level:**
This is production-grade modern CSS architecture using cutting-edge features (oklch colors, container queries, view transitions) that only 5-15% of production websites currently use. This technical excellence translates to user perception of quality and professionalism.

### Visual Design Strategy

**Earth-Tone Color Palette - Strategic Brand Alignment:**

MBU uses nature-inspired earth tones that subconsciously reinforce Scouting's outdoor education mission and natural learning values:

**Color Psychology:**
- **Brown** - Reliability, earthiness, natural connection to outdoor learning
- **Tan** - Warmth, approachability, comfort and accessibility
- **Olive** - Growth, nature, outdoor adventure and exploration
- **Teal** - Clarity, freshness, trust and transparency

**Competitive Color Strategy:**
- **Competitors:** Generic blue (corporate BSA.org), gray/white (lifeless US Scouting Service Project), red/white/blue (dated Boy Scout Trail)
- **MBU:** Earth tones communicate "outdoor adventure and natural learning," not "database of requirements"
- **Strategic positioning:** Modern outdoor education brand, not generic reference website

**Color palette subconsciously signals:** "We're about outdoor adventure and natural learning" aligned with core Scouting values (outdoor skills, nature connection, experiential learning).

**Progressive Enhancement:**
- HSL colors for universal browser support (works on all browsers)
- oklch colors for modern browsers (perceptually uniform colors, visual quality competitors can't match)
- Graceful degradation ensures everyone gets a good experience, modern browsers get exceptional quality

**Fluid Responsive Design:**
- No breakpoint hell - typography and spacing scale naturally using clamp()
- Looks perfect on all screen sizes (320px → 2560px) without manual tweaking
- Container queries enable intelligent component adaptation to context, not just viewport
- Mobile-first with desktop enhancements

**Quality Through Performance:**
- Sub-1-second page loads (per-page CSS loading, critical CSS strategy)
- Smooth interactions (view transitions API, native CSS animations)
- Feels premium through speed and polish
- Performance is a visual design decision, not just technical metric

### Component Philosophy

**Hugo Partials as Component Boundaries:**
- Each partial is a self-contained, reusable UI component
- Component-specific CSS imported only on pages that use the component
- Semantic HTML with accessibility built-in (ARIA labels, keyboard navigation, focus states)

**Design Principles:**
- **Mobile-first** - Start with mobile layout, enhance for desktop
- **Progressive enhancement** - Core functionality works everywhere, enhanced features where supported
- **Container-aware** - Components respond to their container context, not just viewport width
- **Accessible by default** - WCAG 2.1 AA compliance through semantic HTML and proper ARIA

**Scout vs Counselor Component Strategy:**
- **Scout components:** Emphasize visual scanning (icons, stars, pills, badge images) - mobile-optimized, quick comprehension
- **Counselor components:** Emphasize information density (tables, lists, text breakdowns) - desktop-friendly, detailed planning
- **Shared foundation:** Both use same design tokens (colors, spacing, typography) for visual consistency across dual audiences

### Existing Components

Components already built and in production:
- **Navigation cards** - Large touch-friendly cards for primary navigation (container-aware grid)
- **Forms** - Input fields, labels, form layouts with accessibility
- **Tags** - Skill pills, category indicators
- **Callouts** - Highlighted information blocks
- **Profile cards** - Content preview cards
- **Search** - Search input and functionality (full-text search already implemented)
- **Header/Footer** - Site-wide navigation and footer
- **Typography system** - Fluid headings and body text with Geologica font family
- **Button system** - Primary actions and links
- **Spacing utilities** - Consistent spacing patterns using fluid clamp() scales

**Note:** Many existing components will need Phase 1 enhancements to display new metadata (difficulty, time, location, skills).

### Components Needed for Phase 1

New components to build for metadata-rich badge browsing experience:

**Scout-Focused Components (Visual-First):**
- **Badge card (enhanced)** - Enhance existing cards with Phase 1 metadata:
  - Badge images (Gemini Nano-generated, already complete)
  - Difficulty stars ⭐⭐⭐ (visual indicator, not text-only)
  - Time estimate with icon: ⏱️ 8-10 hrs
  - Location with icons: 🏠 Indoor / 🏕️ Outdoor / ↔️ Flexible
  - Skill pills (Leadership, STEM, Outdoor Skills, etc.)
- **Badge list layout** - Grid/list view for taxonomy pages showing badge cards with inline metadata
- **Taxonomy filter component** - Filter badges by skills, difficulty, location, time (simple, focused)
- **Related badge suggestions** - "If you like this, try..." section with 3-5 badge cards showing difficulty
- **Difficulty rating component** - Standalone star rating (1-5 stars) for use across pages
- **Location indicator component** - Icon-based indoor/outdoor/flexible display

**Counselor-Focused Components (Text-Heavy):**
- **Planning information panel** - Materials list, prerequisites, time breakdown (desktop-optimized, text-dense)
- **Changelog display component** - Before/after diff view for requirement changes
- **Time breakdown table** - Per-requirement time estimates in structured table format
- **"Help me plan" wizard UI** - Multi-step form for lesson plan generation (Phase 2+, premium feature)

**Shared Components:**
- **Breadcrumb navigation** - Show taxonomy hierarchy (Skills → Leadership → Camping) for "never stuck" principle
- **"Requirements updated" indicator** - Visual 🆕 badge for badges with changes in last 90 days
- **Requirement explainer component** - Expandable sections below each requirement for "wave of understanding" moments
  - Click/tap to reveal detailed guidance
  - Works without JavaScript (progressive enhancement)
  - Accessible via keyboard navigation
- **Trending/popular badges component** - (Future: post-Phase 1 when traffic warrants implementation)

**Note on Scout vs Counselor Visual Treatment:**
- Scout components emphasize visual scanning with icons, stars, pills, and badge images for quick mobile comprehension
- Counselor components emphasize information density with tables, lists, and text breakdowns for desktop planning workflows
- Both share the same design tokens (colors, spacing, typography) maintaining visual consistency across dual audiences

### User-Facing Quality Indicators

**How Users Perceive the Modern Design:**

1. **Speed = Quality Signal**
   - Instant page loads feel professional and respectful of time
   - Smooth transitions between pages create app-like experience (view transitions API)
   - No layout shift or content jumping maintains trust and credibility

2. **Visual Polish = Trust**
   - Consistent spacing and typography create professional appearance
   - Perceptually uniform colors (oklch) create visual harmony users feel but don't consciously notice
   - Fluid scaling means it looks perfect on every device size, not "good enough on mobile"
   - Earth-tone palette feels aligned with Scouting brand, not generic tech

3. **Intelligence = Empowerment**
   - Components that adapt to their context feel smart and responsive
   - Container-aware layouts adjust to available space naturally (no awkward breakpoints where design suddenly changes)
   - Interactions feel intentional and polished, not generic or clunky

4. **Accessibility = Inclusive**
   - Keyboard navigation works everywhere (no mouse required)
   - Screen reader friendly with semantic HTML and ARIA
   - High contrast, clear focus indicators, no color-only information
   - WCAG 2.1 AA compliance demonstrates quality and care for all users

### Competitive Visual Differentiation

**What Makes MBU Look "Modern" vs Competitors:**

**Competitors (BSA.org, US Scouting Service Project, Boy Scout Trail):**
- Fixed-width layouts that break on mobile or don't exist at all
- Outdated color schemes (generic blues, grays) and typography
- No responsive images, fixed-size assets
- Desktop-only design mindset (mobile afterthought or nonexistent)
- Slow page loads, broken interactions
- Poor information architecture, overwhelming presentation

**MBU Differentiators:**
- Fluid, adaptive layouts work perfectly on all devices (320px → 2560px viewports)
- Earth-tone color palette with visual depth and Scouting brand alignment (not generic database aesthetic)
- Modern typography (Geologica font family) with fluid scaling across viewports
- Visual hierarchy through spacing and scale, not just font size changes
- Smooth, polished interactions (view transitions, native CSS animations)
- Sub-1-second page loads through static generation and optimized CSS
- Intelligent responsive design (container queries, not just viewport breakpoints)

**User Perception Translation:**
"This site feels current, trustworthy, and professional - unlike the outdated competitors." 

Users may not consciously understand WHY it feels better (oklch colors, container queries, fluid typography), but they immediately FEEL the quality difference. The earth-tone palette subconsciously reinforces "outdoor education and natural learning" rather than "corporate database."

**Strategic Brand Positioning:**
MBU looks and feels like a modern outdoor education brand, not a generic reference website. Visual design communicates core Scouting values through color psychology and modern polish.


## Defining Core Experience

### The Defining Experience

**"Get Clear Requirements with Authoritative Guidance"**

Merit Badge University's defining experience is **clarity on requirements** - making the DO/DEMONSTRATE checklist crystal clear through excellent presentation, unique deep linking, and supplemental guidance. While the requirements text itself is sacred (directly from BSA, unalterable), MBU's value comes from HOW requirements are presented and the guidance layer that helps users understand them.

**User Description:**
If users describe MBU to a friend: "It's the site where you can **get authoritative information and guidance on how to complete merit badges**."

**Two-Part Badge Structure:**
1. **Requirements** - What you must DO/DEMONSTRATE (the checklist) - BSA official text, unalterable
2. **Guidance** - HOW to learn the skills/knowledge needed to complete those requirements - MBU value-add layer

**Scope Clarity:**
- **Phase 1:** Clear requirements presentation + deep linking + metadata (difficulty, skills, location, time)
- **Phase 2+:** Guidance/explainer layer + learning resources + "how to learn/teach this" content

**Dual-Audience Application:**
- **Scouts:** Authoritative information + guidance to complete badges themselves
- **Counselors:** Authoritative information + guidance to help scouts complete badges (teaching structure)

### User Mental Model

**Current User Behavior:**

**How Users Get Requirements Today:**
- Google "[badge name] merit badge requirements" (e.g., "camping merit badge requirements")
- Land on scouting.org or competitor sites (typically click top result or familiar site)
- Navigate through dense text with no supplemental information
- Download PDFs or read on-page text
- No deep linking to specific requirements available from competitors

**Mental Model for Requirements:**
- Expect requirements as **structured outline** preserving BSA numbering system (1, 1a, 1a1, 2, 2a, etc.)
- Counselors reference requirements by number: "Let's look at requirement 1.a.1"
- Numbering consistency across all sources (MBU, BSA.org, pamphlets) is critical for communication
- Requirements viewed as official checklist/proof points, not flexible guidelines

**Hierarchy Complexity Understanding:**
- Top-level requirements must all be completed
- Nested requirements vary by badge:
  - "Choose one" (select 1 from multiple options)
  - "Choose two" (select 2 from multiple options)
  - "Complete all" (all sub-requirements required)
  - "Choose one option and complete all sub-requirements" (select one track, complete everything in that track)
- MBU's data.json captures all hierarchy variations
- Currently indicated via text-only ("Do TWO of the following, choosing a different group for each")

**User Expectations:**
- Requirements presented as numbered list (matching BSA format)
- Ability to find specific requirements quickly
- Nested structure visually clear
- No checklist/todo functionality expected (that's Scoutbook's job), though print stylesheet could add this

**What Users Love/Hate About Current Solutions:**
- **Frustration:** Dense text with no supplemental information, requirements buried in PDFs, no way to link to specific requirements
- **No particular love:** Users have low expectations - they just want to find the requirements without friction

**Mental Model for "Authoritative":**
- Authority established through **truth** (accurate BSA requirements, verified dates) and **helpfulness** (guidance that actually helps)
- Not intimidating or prescriptive - helpful and trustworthy
- Official BSA logo/alignment helpful but not sufficient alone
- Professional design + accurate content + helpful guidance = authoritative perception

**Competitive Positioning:**
- **Authoritative but not helpful:** BSA.org (official but confusing)
- **Helpful but not authoritative:** Random blog posts (guidance without accuracy)
- **MBU = Both:** Official accuracy + helpful guidance

**Mental Model for "Guidance":**
- Counselors expect guidance to be flexible ("here are options") not prescriptive ("do exactly this")
- Subject matter experts without teaching expertise need structure but not scripts
- Scouts expect guidance to explain confusing concepts and provide context
- Guidance should help understanding, not replace requirements

### Success Criteria

**Core Experience Success Criteria:**

**"This Just Works" Indicators:**
1. **Requirements immediately accessible** - No hunting through PDFs or multiple pages
2. **Numbering preserved perfectly** - 1.a.1 on MBU = 1.a.1 on BSA.org = 1.a.1 in counselor's reference
3. **Hierarchy visually clear** - Nested requirements look nested, "choose X" options obvious at a glance
4. **Deep linking works flawlessly** - Share requirement 4.a, recipient lands exactly there with highlight
5. **Fast loading** - Sub-1-second page loads, instant requirement access

**User Feels Smart/Accomplished When:**
- Scout: "I understand exactly what I need to do to earn this badge"
- Counselor: "I can reference requirement 3.b and everyone knows what I mean"
- Both: "I can share this exact requirement with someone and they'll see exactly what I'm talking about"

**Feedback That Shows Success:**
- **Visual highlight** - Deep-linked requirement highlighted persistently (already implemented)
- **Copy confirmation** - `#` click copies link to clipboard smoothly (already implemented)
- **Scan confirmation** - Visual indicators make "choose 2 of 5" immediately obvious
- **Speed confirmation** - Page loads instantly, no waiting

**Time Expectations:**
- Finding specific requirement: Instant (via search or scroll)
- Understanding requirement structure: 5-10 seconds of scanning
- Deep linking and sharing: 2-3 seconds (hover/tap, click, paste)
- Reading all requirements: 2+ minutes (measured via time on page metric)

**What Should Happen Automatically:**
- Scroll to deep-linked requirement on page load
- Highlight persists so user knows where they are
- Link copies to clipboard without extra confirmation modal
- Nested requirements visually indent without user action

**Success Metrics (Already Defined Previously):**
- Time on badge page >2 minutes (deep reading, not bounce)
- Deep link # clicks tracked via Pirsch (validates sharing value and measures discoverability)
- Bounce rate <40% on requirements pages

**Deep Link Usage Measurement:**
- Track # click events to understand if users discover this feature
- If usage is low, improve discoverability (tooltips, help text)
- If usage is high, current hover pattern is discoverable enough
- Data-driven decision on enhancement needs

### Novel vs. Established Patterns

**Pattern Analysis:**

The core experience uses **established patterns with one novel innovation:**

**Established Patterns (Familiar to Users):**
1. **Numbered list outline** - Users understand 1, 1a, 1a1 hierarchy from school, documents, BSA materials
2. **Anchor linking** - Web-native pattern (clicking # symbol, URL with hash fragment)
3. **Scroll-to-highlight** - Common pattern on documentation sites, GitHub, etc.
4. **Search + navigate** - Standard web interaction

**Novel Innovation - Individual Requirement Addressability:**
- **MBU's unique pattern:** Hover `#` to copy deep link (2 steps: hover → click)
- **Standard web pattern:** Right-click link → Copy link address (3-4 steps)
- **Innovation:** Significantly faster, more intuitive
- **Discoverability:** Progressive - advanced feature doesn't interfere with basic usage

**No User Education Needed:**
- Established patterns dominate the experience
- Deep linking innovation is discoverable through hover interaction
- Familiar metaphors: Numbered outlines, anchor links, copy-to-clipboard
- Progressive disclosure: Advanced feature enhances but doesn't block core usage

**Mobile Consideration:**
- **Desktop:** Hover reveals `#`, click copies (current implementation)
- **Mobile:** No hover capability - must use always-visible `#` or tap interaction
- **Technical solution:** CSS media queries differentiate desktop (hover-only) vs mobile (always-visible)
- **Design requirement:** Ensure mobile users can discover and use deep linking without hover

**Unique Twist on Established Pattern:**
MBU's innovation is making **requirements individually addressable** - treating each requirement as a first-class resource with its own URL. This transforms requirements from "walls of text" to "discrete, shareable, searchable units."

**Competitive Advantage:**
- **BSA.org:** Requirements in PDFs (not individually linkable)
- **US Scouting Service Project:** Requirements on page but no deep linking
- **Boy Scout Trail:** Requirements on page but no deep linking
- **MBU:** Every requirement has unique, shareable URL

**Network Effects from Deep Linking:**
Every time someone shares a MBU deep link:
- New user discovers MBU exists
- Sees the unique feature immediately (lands on highlighted requirement)
- More likely to use MBU for their own sharing
- Creates organic growth loop through social sharing

**Marketing Positioning:**
"The only merit badge site where every requirement has its own link - share camping requirement 4.a and your friend lands exactly there."

This makes MBU the **reference standard** - when someone says "look at Camping requirement 4.a," the natural response becomes "here's the MBU link."

**Strategic Headline Feature:**
Don't hide this differentiator:
- Homepage hero copy highlights deep linking
- "How to use this site" section demonstrates it
- Screenshots/examples show the feature in action
- SEO opportunity: Target "camping merit badge requirement 4a" individual requirement searches

### Experience Mechanics

**The Defining Experience: "Get Clear Requirements"**

**1. Initiation - Starting the Core Action:**

**Entry Points:**
- Google search lands on badge page: "camping merit badge requirements"
- Taxonomy page navigation: Click badge card from skills/location/difficulty page
- Direct bookmark: Returning user to saved badge
- Deep link from friend/counselor: Lands on specific requirement with highlight

**Invitation to Begin:**
- Requirements immediately visible (or prominently linked if on subpage)
- Clear page title: "[Badge Name] Merit Badge Requirements"
- Visual metadata above requirements: Difficulty ⭐⭐⭐, Time ⏱️, Location 🏕️
- Breadcrumb navigation shows context

**2. Interaction - Core User Actions:**

**Scanning Requirements:**
- Visual hierarchy makes structure immediately clear
- Nested requirements visually indented (1 → 1.a → 1.a.1)
- "Choose X" indicators visually distinct from "complete all" (enhancement opportunity based on user data)
- Quick scan reveals: How many top-level requirements? Any choices? Nested complexity?

**Reading Specific Requirements:**
- Numbered list matches BSA format exactly (numbering is sacred)
- Deep linking highlight draws eye to specific requirement
- Text clarity comes from BSA source (unalterable)
- Supplemental guidance (Phase 2+) provides context where needed

**Sharing Requirements:**
- **Desktop:** Hover over any requirement reveals `#` symbol → Click copies deep link to clipboard instantly
- **Mobile:** `#` symbol always visible (no hover capability) → Tap copies link
- No confirmation modal (smooth, fast interaction)
- Link format: `/merit-badges/[badge]/requirements/#[req-path]`
- Progressive enhancement: Clipboard API with fallback for older browsers

**Navigating Hierarchy:**
- Scroll through requirements naturally
- Deep links jump directly to specific nested items with smooth scroll
- Breadcrumb navigation provides escape route
- Related badges suggest alternatives if this badge doesn't fit

**3. Feedback - Success Indicators:**

**Visual Confirmation:**
- **Deep-linked requirement** highlighted persistently (not temporary flash)
- **Sufficient contrast** for highlight (WCAG 2.1 AA compliance)
- **Hover state** on `#` symbol indicates interactivity (desktop)
- **Always-visible `#`** on mobile (CSS media queries differentiate)
- **Nested indentation** shows hierarchy visually
- **Scroll position** confirms navigation to correct requirement with context visible above/below

**Interaction Feedback:**
- **Link copied** - `#` click provides immediate clipboard copy (no modal interrupt)
- **Fast response** - All interactions feel instant (no lag or loading states)
- **Clear visual indicators** - "Choose 2 of the following" stands out from requirement text (data-driven enhancement)
- **Hierarchy understanding** - Scanning quickly reveals structure

**System Response:**
- Page loads instantly (<1 second)
- Deep link scrolls smoothly to requirement
- Highlight persists so user stays oriented
- Bookmark/reload preserves highlight (URL hash maintained)
- No errors, no broken links, no confusion

**Error Prevention:**
- All requirement IDs valid (generated from data.json)
- Deep links always work (no 404s)
- Hierarchy always renders correctly
- Copy to clipboard works across all browsers (with fallback)

**4. Completion - Successful Outcome:**

**Scout Success:**
- **Understanding:** "I know exactly what I need to do to earn this badge"
- **Clarity:** "The requirements are organized and make sense"
- **Sharing:** "I sent requirement 4.a to my patrol leader and they saw exactly what I meant"
- **Confidence:** "I'm prepared to start working on this badge" (Be Prepared emotional goal)

**Counselor Success:**
- **Communication:** "I can reference requirement 3.b and scouts know exactly what I mean"
- **Planning:** "I understand the full scope of what scouts need to demonstrate"
- **Verification:** "Requirements match BSA official sources - I can trust this"
- **Sharing:** "I sent this to my co-counselor and they landed on the exact requirement"

**Network Effect Success:**
- **New user discovery:** Friend shares MBU deep link → recipient discovers site + unique feature
- **Adoption:** New user more likely to use MBU for their own sharing
- **Organic growth:** Each share introduces MBU to new scouts/counselors
- **Reference standard:** MBU becomes default for "share a specific requirement"

**What's Next:**
- Scout: Begins learning phase (with counselor and resources) or continues exploring other badges
- Counselor: Begins lesson planning using requirements as foundation
- Both: Bookmark page for future reference
- Both: Share specific requirements with patrol members, co-counselors, parents (creating network effects)

**Measurable Success:**
- Time on badge page >2 minutes (deep reading)
- Deep link # clicks tracked via Pirsch (validates sharing behavior and measures feature discoverability)
- Return visitor rate (bookmarking behavior)
- Low bounce rate (found what they needed)

### Design Implications for Clarity

**Visual Enhancements to Make Requirements Clearer (Without Altering Text):**

**1. Choice Indicators - Data-Driven Enhancement**
- **Current:** Text-only ("Do TWO of the following, choosing a different group for each")
- **Opportunity:** Visual badges/pills for "Choose X of the following"
- **Design options:**
  - Pill/badge before group: `[Choose 2]` in colored badge (simplest, cleanest, mobile-friendly)
  - Border/background: Different background color for choice groups
  - Icon + text: 🔢 Choose 2 combined with visual container
- **Implementation decision:** Start simple (pill/badge), iterate based on user data
- **Validation metric:** If analytics show excessive time on pages with choice requirements, users are confused - add visual indicators. If time is normal, text-only may be sufficient.
- **Philosophy:** Don't over-design without data - document opportunity, implement if needed

**2. Nested Requirement Indentation - Enhanced Visual Hierarchy**
- Currently nested with visual indentation (working)
- Enhancement opportunities: Connecting lines, subtle background shading, increased indentation depth
- Clear parent-child relationship at a glance
- Mobile-friendly (deep nesting doesn't break on small screens with fluid spacing)

**3. Requirement Number Prominence - Scannable References**
- Bold or visually distinct requirement numbers (1.a.1)
- Easier to reference in verbal/written communication
- Facilitates counselor instruction ("everyone look at 3.b")
- Mobile: Ensure numbers remain prominent even with smaller font sizes

**4. Deep Link Discoverability - Mobile vs Desktop**
- **Desktop (current):** Hover reveals `#` symbol (clean interface, progressive disclosure)
- **Mobile (needs solution):** No hover capability - use always-visible `#` via CSS media queries
- **Technical:** CSS differentiates desktop (hover-only) vs mobile (always-visible)
- **Discoverability measurement:** Track # click events via Pirsch
  - If usage low, improve discoverability (first-time tooltip, help text in header)
  - If usage high, current pattern is discoverable enough
  - Data-driven enhancement decisions
- **Progressive enhancement:** Clipboard API with fallback (select text + execCommand) for older browsers

**5. Persistent Highlight Styling - Deep Link Clarity**
- Current: Highlight persists when deep linked (good)
- Ensure sufficient color contrast (WCAG 2.1 AA: 4.5:1 for text)
- Scroll margin shows context above/below highlighted requirement
- Bookmark/reload preserves highlight (URL hash maintained)

**6. Print Stylesheet Enhancement - Easy Win for Checklist Functionality**
- Add checkbox □ before each requirement in print view (pure CSS)
- Scouts/counselors can print and check off as completed
- Physical artifact for tracking progress
- Zero JavaScript, works everywhere
- Doesn't interfere with digital experience
- Small feature that solves real user need

**Future Guidance Layer (Phase 2+):**
- Expandable sections below each requirement (click/tap to reveal)
- "What this means" plain language explanations
- Visual diagrams or photos where helpful
- Links to learning resources
- Doesn't interfere with requirement clarity - progressive disclosure
- Creates "wave of understanding" moments


## Visual Design Foundation

### Color System

**Official Scouting America Scout Uniform Colors (Established)**

MBU uses the canonical tan and olive colors from the Scout uniform as the visual foundation, ensuring authentic brand alignment and immediate recognition within the Scouting community.

**Color Palette (Already in Production):**
- **Brown scales:** --brown-000 through --brown-800 (10 shades)
- **Tan scales:** --tan-000 through --tan-900 (10 shades) - **Scout uniform tan**
- **Olive scales:** --olive-100 through --olive-700 (7 shades) - **Scout uniform olive**
- **Teal scales:** --teal-300 through --teal-600 (4 shades) - Accent color
- **Gray scales:** --gray-500 through --gray-700 (3 shades) - Neutral text

**Primary Applications:**
- **Text:** `--olive-500` (primary text color)
- **Backgrounds:** `--light-bg` (tan gradient), `--dark-bg` (tan gradient)
- **Interactive elements:** Tan and olive for buttons, cards, navigation
- **Buttons:** Olive backgrounds with tan text (uniform colors in action)

**Progressive Enhancement:**
- HSL colors as baseline (universal browser support)
- oklch colors for modern browsers (perceptually uniform, better visual quality)
- Graceful degradation ensures consistent experience across all browsers

**Accessibility:**
- All color combinations meet WCAG 2.1 AA contrast requirements (4.5:1 for text, 3:1 for UI)
- No information conveyed by color alone (icons, text, patterns supplement color)
- High contrast mode considered for accessibility preferences
- Current palette validated for sufficient contrast ranges

**Strategic Rationale:**
Using the actual Scout uniform colors (not just "earth tones") creates authentic brand connection and immediate visual recognition for scouts, counselors, and parents. This is the Scouting aesthetic - not generic outdoor/nature branding, but specifically BSA Scout program identity.

**Competitive Positioning:**
- **BSA.org:** Uses official colors but poorly executed (outdated design)
- **US Scouting Service Project:** Generic blue/white (no brand alignment)
- **Boy Scout Trail:** Red/white/blue patriotic (not Scout-specific)
- **MBU:** Official Scout uniform colors + modern execution = authentic + contemporary

**Color Source Documentation:**
Official Scouting America Scout uniform tan and olive colors. These are the defining colors of the Scout program uniform worn by all scouts.

**Iteration Strategy for Phase 1:**
Foundation colors established. Define semantic colors for new Phase 1 needs:
- **Difficulty rating colors:** 5-level scale (easy green → very difficult purple/red)
- **Status indicators:** New/updated badges (🆕 indicator color), trending badges
- **Interactive states:** Hover, focus, active, disabled states for new components
- **Success/warning/error:** Messaging colors for forms and interactions

### Typography System

**Primary Typeface: Geologica Variable Font (Established)**

**Font Properties:**
- **Family:** Geologica (modern variable font)
- **Weight range:** 100-900 (full variable font spectrum available)
- **Loading strategy:** `font-display: swap` (prevent layout shift, maintain performance)
- **Format:** WOFF2 (optimal compression and browser support)
- **Performance:** Single font file loads all weights (efficient)

**Type Scale (Fluid Typography):**
Fluid type scale using clamp() for responsive text sizing without breakpoints:
- **--step--2:** 0.89rem - 0.96rem (smallest text, metadata)
- **--step--1:** 1rem - 1.2rem (small text, captions)
- **--step-0:** 1.125rem - 1.5rem (body text, 18px base)
- **--step-1:** 1.27rem - 1.88rem (h4, card titles)
- **--step-2:** 1.42rem - 2.34rem (h3, section headings)
- **--step-3:** 1.6rem - 2.93rem (h2, major headings)
- **--step-4:** 1.8rem - 3.66rem (large display text)
- **--step-5:** 2.03rem - 4.58rem (larger display text)
- **--step-6:** 2.28rem - 5.72rem (h1, hero text, page titles)

**Typography Hierarchy:**
- **Body text:** --step-0 (1.125rem base = 18px), weight 300 (light), line-height 1.5 (relaxed)
- **Headings:** weight 900 (boldest), line-height 1.25 (tight)
- **H1:** --step-6, `text-wrap: balance` for optimal line breaks
- **H2:** --step-3
- **H3:** --step-2
- **H4:** --step-1
- **Small text:** --step--1 or --step--2 for metadata, captions

**Readability Enhancements:**
- `text-wrap: pretty` on headings (modern CSS, better line breaks)
- `text-wrap: balance` on h1 (optimal multi-line heading layout)
- 60ch max-width for long-form text content (optimal reading line length)
- Base size 18px (above 16px minimum for accessibility)

**Body Weight Consideration - Testing Priority:**
- **Current:** Body text at weight 300 (light) - elegant and modern
- **Concern:** May be too thin on low-DPI displays, Windows devices, or lower-quality screens
- **Testing checklist:**
  - Test on non-Retina displays (older desktop monitors)
  - Test on Windows with ClearType rendering (fonts render differently than macOS)
  - Gather beta user feedback on readability
- **Quick fix if needed:** Change to weight 400 (regular) - one-line CSS adjustment
- **Decision approach:** Keep 300 for launch, monitor feedback, adjust if users report readability issues

**Visual Personality:**
Current typography creates: Modern, approachable, nature-connected aesthetic. Not playful/childish, not corporate/stuffy. Sophisticated but accessible - appropriate for dual audience (11-17 year old scouts + adult counselors).

### Spacing & Layout Foundation

**Fluid Spacing System (Established)**

Consistent spacing scale using clamp() with container query units (`cqi`) for context-aware responsive sizing:

**Spacing Scale:**
- **--space-3xs:** 0.31rem - 0.38rem (tiny gaps, tight spacing)
- **--space-2xs:** 0.56rem - 0.75rem (small spacing, compact elements)
- **--space-xs:** 0.88rem - 1.13rem (compact spacing)
- **--space-s:** 1.13rem - 1.5rem (standard component spacing)
- **--space-m:** 1.69rem - 2.25rem (medium spacing, section separation)
- **--space-l:** 2.25rem - 3rem (large spacing, visual breathing room)
- **--space-xl:** 3.38rem - 4.5rem (extra large, major sections)
- **--space-2xl:** 4.5rem - 6rem (section boundaries)
- **--space-3xl:** 6.75rem - 9rem (major page sections)

**Layout Container:**
- **Max-width:** 75rem (1200px) - comfortable reading and browsing width
- **Padding:** 1rem inline padding (maintains content away from edges)
- **Container queries:** Enabled via `container-type: inline-size` for component-aware responsive design
- **Minimum height:** `calc(100svh - 26rem)` for main content (ensures footer pushed down)

**Content Layouts:**
- **Text content:** 60ch max-width for optimal reading line length (typography best practice)
- **Grid systems:** Component-specific (nav-cards use CSS Grid with container queries)
- **Flexible containers:** Components adapt to available space using container queries

**Spacing Philosophy:**
- All spacing uses design tokens (no hardcoded pixel/rem values)
- Fluid scaling eliminates need for breakpoint-specific spacing adjustments
- Container query units (`cqi`) enable context-aware spacing that adapts to component container, not viewport
- Consistent rhythm creates visual polish

**Layout Patterns:**
- **Mobile-first:** Start with single-column, enhance to multi-column based on container width
- **Container-aware:** Components respond to their container, not viewport (more intelligent responsive behavior)
- **Intrinsic sizing:** CSS Grid and Flexbox with `auto` and `fr` units for natural content-driven layouts
- **Minimal breakpoints:** Fluid spacing and typography reduce need for explicit breakpoints

**Iteration Strategy for Phase 1:**
New badge browsing components will establish additional layout patterns:
- Badge card grid layouts (container-aware responsive columns)
- Taxonomy page organization (list vs grid views)
- Requirement list formatting (nested hierarchy with indentation)
- Counselor planning panel layouts (desktop-optimized multi-column)

### Visual Elements - Current State & Phase 1 Needs

**Buttons (Partially Defined):**

**Already Implemented:**
- Primary button: Olive background (`--olive-500`), tan text, boldest weight (900)
- Secondary button: Transparent background, olive border, olive text
- Button sizes: Default and small variant
- Interactive states: Hover and focus (darkens to `--olive-600`)
- Transition: 0.2s on background and color

**Phase 1 Refinements Needed:**
- Disabled state styling (visual + cursor indicator)
- Tertiary/text button variant (no border, minimal style)
- Focus indicators for keyboard accessibility (high-contrast visible outline)
- Tap target validation (44x44px minimum for mobile)
- Icon + text button patterns (for "View requirements," "Help me plan")

**Iteration Approach:** Current button foundation is solid. Add states and variants as specific Phase 1 use cases emerge.

**Shadows & Depth (Minimal for Phase 1):**

**Current Implementation:** Basic (not extensively defined)

**Phase 1 Needs:**
- **Flat (no shadow):** Default state for most components
- **Elevated (subtle shadow):** Hover states on cards, interactive elements
- **Depth levels:** One or two levels maximum (avoid complex elevation system)
- **Performance consideration:** Keep shadow CSS minimal (<100 bytes), CSS bytes add up

**Approach:** Define shadows as needed for badge cards and interactive panels. Start with simple `box-shadow` declarations, avoid heavy drop shadows that feel dated.

**Animations & Transitions (Minimal for Phase 1):**

**Already Implemented:**
- View transitions API enabled globally (`@view-transition { navigation: auto; }`)
- 0.2s transitions on links and buttons

**Phase 1 Needs:**
- **Timing standards:** Fast (150ms), medium (250ms), slow (350ms) based on interaction type
- **Easing:** Use native ease-in-out or ease functions (avoid custom cubic-bezier unless needed)
- **What gets animated:**
  - Page transitions (view transitions API handles automatically)
  - Hover/focus states (already defined on buttons)
  - Expandable sections (future guidance/explainers)
  - Loading states (if needed for premium wizard)

**Approach:** Leverage view transitions API (already enabled, zero additional CSS). Add custom animations only when specific interactions require them. Keep animation CSS minimal.

**Interactive States (Define as Components Built):**

**Current:** Basic hover on navigation cards and buttons

**Phase 1 Needs:**
- Consistent hover states across all interactive elements
- Keyboard focus indicators (high contrast, visible outline, WCAG 2.1 AA)
- Active states (while clicking/tapping)
- Disabled states (visual indicator, no cursor pointer)
- Loading states (for premium wizard, if needed)

**Approach:** Define per component during Phase 1 development. Ensure keyboard focus indicators are prominent and accessible.

**Iconography Strategy:**

**Current Approach:** Using Unicode emojis for icons (⭐, ⏱️, 🏠, 🏕️)

**Emoji Pros:**
- Zero file size overhead (no SVG loading)
- Color automatically with text color
- Work everywhere (universal support)
- Fast to implement

**Emoji Cons:**
- Screen readers announce them (can be verbose: "star star star" for ⭐⭐⭐)
- Inconsistent rendering across platforms (Apple emoji vs Google emoji look different)
- Limited customization (size, color control)

**Accessibility Solution:**
Use `aria-label` on containers to control screen reader announcements:
```html
<span class="difficulty" aria-label="Difficulty: 3 out of 5">
  ⭐⭐⭐
</span>
```

**Phase 1 Approach:**
- Keep emojis (fastest to ship, works well enough)
- Add proper aria-labels for accessibility
- Monitor cross-platform rendering consistency

**Phase 2 Consideration:**
Evaluate SVG icon system if:
- Emoji rendering inconsistent across devices
- Need more visual control (custom colors, sizes)
- Screen reader verbosity becomes issue
- Performance impact negligible with optimized SVG sprites

**Current Icons in Use:**
- ⭐ Difficulty stars
- ⏱️ Time estimates
- 🏠 Indoor location
- 🏕️ Outdoor location
- ↔️ Flexible location
- 🆕 New/updated indicator

### Accessibility Considerations

**WCAG 2.1 AA Compliance (Required for All Pages):**

**Color Contrast:**
- **Text minimum:** 4.5:1 contrast ratio against background (WCAG AA)
- **UI components minimum:** 3:1 contrast ratio (WCAG AA)
- **Current validation:** Tan/olive palette tested for sufficient contrast ranges
- **Primary text:** `--olive-500` on `--tan-100` backgrounds meets contrast requirements

**Typography Accessibility:**
- **Base font size:** 1.125rem (18px) - above 16px accessibility minimum
- **Body weight:** 300 (light) - **testing priority** for readability concerns
  - Monitor feedback on low-DPI displays, Windows devices
  - Quick fix available: Increase to 400 (regular) if users report readability issues
- **Headings:** High contrast weight (900) ensures scannability and hierarchy
- **Line height:** 1.5 for body text (optimal readability), 1.25 for headings
- **Text wrapping:** Modern CSS `text-wrap: pretty` and `text-wrap: balance` for better line breaks

**Interactive Element Accessibility:**
- **Focus indicators:** Visible on all interactive elements (required for keyboard navigation)
  - High contrast, sufficient size (3px minimum)
  - No focus outline removal without replacement
- **Tap targets:** Minimum 44x44px for touch devices (mobile-first audience)
- **Keyboard navigation:** Full site navigable without mouse
- **No hover-only interactions:** Desktop hover states have keyboard/mobile equivalents

**Progressive Enhancement:**
- Core functionality works without JavaScript
- Modern CSS features degrade gracefully (oklch → HSL, container queries → standard responsive)
- View transitions API graceful fallback (instant navigation if unsupported)

**Testing Strategy:**
- **Lighthouse audits:** Target 100 accessibility score on all pages
- **Screen reader testing:** VoiceOver (macOS/iOS), test emoji announcements with aria-labels
- **Keyboard-only navigation:** Tab through entire site, ensure all actions accessible
- **Color contrast validation:** Use tools to verify all text/UI meets WCAG AA minimums
- **Cross-platform font rendering:** Test Geologica weight 300 on Windows, low-DPI displays

### Visual Foundation Strategy

**Established Foundation:**
The visual system is already in production and working well:
- Official BSA Scout uniform colors (tan and olive) ensure authentic brand alignment
- Geologica variable font provides modern, flexible typography
- Fluid spacing creates consistent rhythm across all viewports
- Progressive enhancement ensures universal browser compatibility
- Container queries enable intelligent responsive components

**Visual Personality:**
Current design creates: **Modern, approachable, Scouting-authentic** aesthetic. Not playful/childish, not corporate/stuffy. Sophisticated but accessible - appropriate for dual audience (11-17 year old scouts + adult counselors). The Scout uniform colors ground the design in authentic Scouting identity.

**Iteration Philosophy:**
"Build what's needed when it's needed" - don't over-design visual elements until specific use cases emerge. Current foundation provides strong base for Phase 1 component development.

**Phase 1 Refinement Areas:**
- Button states (disabled, tertiary/text variants, icon + text patterns)
- Shadow/elevation system for badge cards and planning panels (keep minimal)
- Consistent animation timing standards (fast 150ms, medium 250ms, slow 350ms)
- Interactive state designs (hover, focus, active, disabled)
- Icon strategy refinement (continue with emojis + aria-labels, evaluate SVG in Phase 2)
- Difficulty rating colors (5-level visual scale)

**Data-Driven Refinement:**
- Monitor readability feedback on body weight 300 (test on non-Retina, Windows devices)
- Track user engagement with visual components
- A/B test button styles and interactive patterns if needed
- Iterate based on accessibility testing feedback and real user issues

**Visual Refinement Backlog (Track for Future):**
- Body font weight adjustment (300 → 400) if readability concerns emerge
- SVG icon system if emoji rendering inconsistent across platforms
- Sophisticated shadow system if depth hierarchy becomes confusing
- Advanced animation patterns if interactions need more polish

**Guiding Principle:**
"Good enough to ship, iterate to perfect" - current visual foundation supports Phase 1 launch, refinements based on real user feedback and specific component needs. Don't over-engineer before user validation.


## Design Direction Decision

### Design Directions Explored

**Exploration Process:**
Through 6 rounds of design mockups (50+ unique directions), we explored a wide range of visual approaches:
- Brutalist aesthetics with thick borders and hard shadows
- Glassmorphism, neumorphism, and contemporary effects
- Magazine layouts, newspaper columns, and editorial styles
- Card grids, tables, timelines, and unconventional layouts (periodic table, subway map, bookshelf metaphors)
- Responsive transformations (table to cards, multi-column to single-column)
- Hover/focus expand interactions for progressive disclosure

**Key Design Elements Identified:**
- Labeled metadata for quick scanning (difficulty, time, location prominently displayed)
- Brutalist elements (4px borders, hard offset shadows, bold typography)
- Full-width layouts that use horizontal space effectively on desktop
- Responsive strategies (table/spreadsheet on desktop, cards on mobile)
- Dark mode exploration with neon accents
- Various eagle-required indicators (corner badges, inline tags, stamps, ribbons)

### Chosen Direction

**Content-First Design Philosophy: Existing Foundation + Selective Refinements**

After extensive exploration, the decision is to **retain and refine the existing design** rather than implement a completely new direction.

**Core Principle:** "Design should be invisible - users should notice the content, not the aesthetic."

The existing MBU design already achieves this goal:
- Clean card structure puts content first
- Clear information hierarchy
- Doesn't compete with badge information for attention
- Modern and trustworthy without being flashy

**Phase 1 Enhancements:**
- Add eagle-required indicators (🦅 badge or tag)
- Display Phase 1 metadata (difficulty stars, time estimates, location icons, skill tags)
- Subtle brutalist touches if needed (test individually, data-driven):
  - Slightly thicker borders (consider 3-4px instead of current)
  - Subtle shadows (consider adding soft elevation or very subtle hard shadow)
  - Reduce border radius slightly (more square corners, less rounded)

**Design Philosophy: Get Out of the Way**
The aesthetic serves the information, doesn't compete with it. Users should immediately see:
- "Camping is moderate difficulty" (⭐⭐⭐)
- "Takes 8-10 hours" (⏱️)
- "Outdoor required" (🏕️)
- "Eagle-required badge" (🦅)

NOT notice:
- Border styling choices
- Shadow effects
- Typography decisions
- Color palette sophistication

### Design Rationale

**Why Existing Design Works:**

1. **Content-First Philosophy**
   - Information hierarchy is clear and scannable
   - Badge metadata is the hero, not the visual treatment
   - Design doesn't distract from decision-making (scouts choosing badges, counselors planning)

2. **Already Modern and Trustworthy**
   - Scout uniform colors (tan/olive) create brand alignment
   - Clean typography (Geologica variable font) feels contemporary
   - Fluid spacing and responsive design work across all viewports
   - Competitors are "bland and outdated" - existing MBU already wins this comparison

3. **Proven Foundation**
   - Site is live with actual users
   - Performance is optimized (sub-1-second loads)
   - Accessibility foundation established
   - No need to rebuild what's working

4. **Faster Phase 1 Implementation**
   - Don't redesign entire site - add metadata display to existing cards
   - Focus development time on content (difficulty generation, skills tagging) not visual redesign
   - Ship Phase 1 faster by iterating instead of rebuilding

**Competitive Advantage Comes From:**
- Clear requirements with deep linking (unique feature, no competitor has this)
- Rich metadata (difficulty, time, skills, location - competitors lack this)
- Fast performance (static generation, optimized CSS)
- Mobile-friendly responsive design
- Taxonomy-powered discovery (50+ landing pages for SEO)

NOT from bold visual design choices.

### Implementation Approach

**Phase 1: Add Metadata Display to Existing Cards**

**Badge Card Enhancements:**
- Add difficulty stars (⭐⭐⭐) prominently visible
- Add time estimate with icon (⏱️ 8-10 hrs)
- Add location indicator with icon (🏠/🏕️/↔️)
- Add skill pills/tags (Leadership, Outdoor Skills, etc.)
- Add eagle-required indicator (🦅 Eagle badge or tag)
- Maintain existing card structure and layout

**Responsive Strategy:**
- Mobile: Badge cards in single column grid
- Tablet: 2-3 column grid based on viewport width
- Desktop: 3-4 column grid with full metadata visible
- Use existing container queries and fluid spacing

**Visual Refinement (Optional, Data-Driven):**
- Test slightly thicker borders (3-4px instead of current)
- Test subtle shadows (soft elevation or minimal hard shadow)
- Test reduced border radius (more square corners)
- Implement only if user feedback suggests current design feels too soft

**Iteration Philosophy:**
"Good enough to ship, iterate to perfect" - existing foundation is solid, refinements based on real user feedback and Phase 1 metadata display needs.

### Future Exploration Ideas (Documented for Later)

**Captured from design exploration process:**

1. **"Path to Eagle Scout" Builder** (from direction #23 in v3)
   - Interactive tool where scouts build their 21 badge plan (14 eagle + 7 electives)
   - Choose order they want to achieve badges
   - Track progress using localStorage
   - Share path via URL
   - Phase 2+ feature

2. **Swipe/Gesture Interactions** (from direction #34 in v3)
   - Mobile gesture exploration for badge browsing
   - Swipe to bookmark/save badges
   - Phase 2+ mobile enhancement

3. **Quick Filter Box** (from direction #27 in v5)
   - Text input to filter badges on page (reduce scrolling)
   - Different from requirements search (filters badge list, not requirement text)
   - Phase 1 or Phase 2 enhancement

4. **Comparison Matrix View** (from direction #28/#40 in v5/v6)
   - Spreadsheet-style side-by-side comparison
   - Counselor/troop leadership optimized view
   - Eagle-required optimization mindset (choose easiest/fastest)
   - Phase 2+ feature

5. **Kanban Progress Tracking** (from direction #35 in v4)
   - "To Start / In Progress / Completed" columns
   - localStorage-based tracking (no login required)
   - Phase 2+ feature, consider multi-user conflict (siblings on same computer)

6. **Popular Badge Carousel** (from direction #33 in v5)
   - Homepage feature showing trending/popular badges
   - Slideshow presentation, one at a time
   - When traffic warrants (post-Phase 1)

7. **Advanced/Database View** (from direction #36/48 in v5/v6)
   - Notion-style table with view tabs (Table/Gallery/Board)
   - Leader planning interface for MBU event planning
   - Phase 2+ feature for counselors/troop leadership

8. **Dark Mode** (from direction #19/#42)
   - Dark theme with neon/teal accents
   - Brutalist aesthetic in dark mode
   - Phase 2+ accessibility enhancement


## User Journey Flows

### Journey 1: Scout Discovery & Badge Selection

**User:** Scout searching for badges by constraints (indoor, difficulty, time, skills)

**High-Level Flow:**
1. **Entry:** Google search → Land on taxonomy page (e.g., `/badges/indoor-required/`)
2. **Scan:** View badge cards with metadata visible (difficulty ⭐, time ⏱️, location 🏠/🏕️)
3. **Filter/Navigate:** Click skill tag or difficulty filter → Navigate to refined taxonomy page
4. **Select:** Click badge card → Land on badge requirements page
5. **Understand:** Read requirements, see metadata, check eagle status
6. **Decision:** Bookmark badge or continue exploring via related badges
7. **Success:** Scout knows which badge they want to pursue

**Key Interactions:**
- Badge card hover shows additional context
- Metadata visible without clicking into badge
- Related badges provide "never stuck" escape hatch
- Deep linking enables sharing with patrol/counselor

### Journey 2: Counselor Lesson Planning

**User:** Counselor planning to teach a badge at MBU event

**High-Level Flow:**
1. **Entry:** Google "[skill] merit badges" → Land on skill taxonomy page (e.g., `/skills/leadership/`)
2. **Compare:** Scan multiple badges with time estimates visible
3. **Select:** Click badge that fits timeframe → Badge requirements page
4. **Analyze:** Review requirements, time per requirement, materials needs
5. **Plan:** Note prerequisites, materials, time breakdown
6. **Confidence:** Counselor feels prepared to teach
7. **Success:** Bookmark page, return for lesson delivery

**Key Interactions:**
- Time estimates visible on list pages (comparison shopping)
- Materials/prerequisites clearly displayed
- "Help me plan" wizard button (Phase 2+ premium feature)
- Changelog accessible if returning counselor

### Journey 3: Requirement Change Awareness

**User:** Returning counselor checking for requirement updates

**High-Level Flow:**
1. **Entry:** Direct navigation to badge page (bookmark from previous year)
2. **Discover:** See "🆕 Requirements updated" indicator prominently displayed
3. **Investigate:** Click indicator → Navigate to changelog page
4. **Review:** See before/after diff of requirement changes
5. **Update:** Adjust lesson plan based on changes
6. **Success:** Confident teaching current, accurate requirements

**Key Interactions:**
- Visual indicator prominent on badge page (not buried)
- Changelog shows clear before/after comparison
- "Last updated" date provides recency context
- Email notification brought counselor back (if subscribed)

### Journey Patterns

**Common Navigation Patterns:**
- **Multiple entry points:** Google search, direct bookmarks, internal navigation all work
- **Breadcrumb escape:** Always clear path back to taxonomy/browse pages
- **Related content:** Every page offers next steps (related badges, skill pages, etc.)
- **"Never stuck" principle:** Multiple discovery paths always available

**Decision Support Patterns:**
- **Metadata at-a-glance:** Difficulty, time, location visible before clicking into badge
- **Progressive disclosure:** Basic info on list pages, detailed info on badge pages
- **Comparison enabled:** Eagle-required badges emphasize side-by-side evaluation
- **Clear indicators:** Visual badges for eagle-required, location, difficulty make scanning fast

**Feedback Patterns:**
- **Persistent highlights:** Deep-linked requirements stay highlighted (orientation maintained)
- **Visual change indicators:** 🆕 badge for recent updates (recency communicated)
- **Fast response:** Sub-1-second loads confirm actions (speed = quality signal)
- **Clear success states:** Bookmarked, shared, requirement understood = measurable outcomes

### Flow Optimization Principles

**Minimize Steps to Value:**
- Requirements accessible in ≤2 clicks from any entry point
- Metadata visible without clicking (list page display)
- Search always available (quick filter for power users)

**Reduce Cognitive Load:**
- One primary action per page (browse badges, read requirements, compare badges)
- Progressive disclosure (don't show all 143 badges, use taxonomy subsets)
- Visual hierarchy guides eye to most important information first

**Clear Feedback:**
- Persistent highlight on deep-linked requirements
- Visual indicators communicate state (new, updated, eagle-required)
- Fast page loads signal quality and progress

**Delight Moments:**
- First impression: Modern design vs outdated competitors
- Discovery: Finding perfect badge instantly via taxonomy
- Understanding: "Wave of understanding" when requirement explainer clicks
- Efficiency: Counselor saves hours with time estimates/planning tools

**Error Recovery:**
- "Never stuck" - related badges, breadcrumbs, search always available
- No dead ends - every page offers next steps
- Deep link always works - no 404s on requirement links


## Component Strategy

### Design System Components (Already Built)

**Existing Hugo Partials & Components:**
- Navigation cards (nav-card.scss) - large touch-friendly navigation
- Forms (forms.scss) - input fields, labels
- Tags (tag.scss) - skill pills, category indicators
- Callouts (callout.scss) - highlighted information blocks
- Profile cards (profile-card.scss) - content preview cards
- Search (\_search.scss) - search input with full-text capability
- Header/Footer - site-wide navigation
- Button system (button.scss) - primary, secondary variants
- Typography system - fluid headings, Geologica font
- Spacing utilities - consistent spacing patterns

**Foundation is solid - focus on Phase 1 enhancements to existing components.**

### Custom Components for Phase 1

**Badge Card Enhancements (Priority 1):**
- Add difficulty stars display (⭐⭐⭐) - visual indicator
- Add time estimate with icon (⏱️ 8-10 hrs) - scannable metadata
- Add location indicator (🏠 Indoor / 🏕️ Outdoor / ↔️ Flexible) - icon + label
- Add skill pills/tags - clickable links to skill taxonomy pages
- Add eagle-required indicator (🦅 Eagle badge) - brown background, prominent placement
- Enhance existing badge cards rather than creating new component

**Difficulty Rating Component (Priority 1):**
- Standalone star rating (1-5 stars) for reuse across badge lists and detail pages
- Accessible with aria-label ("Difficulty: 3 out of 5")
- Visual-only stars for scouts, text alternative for screen readers

**Location Indicator Component (Priority 1):**
- Icon-based display with text label
- Three variants: Indoor (🏠), Outdoor (🏕️), Flexible (↔️)
- Special locations when needed: Pool (🏊), Range (🎯), Wilderness (🏔️)
- Accessible with clear text labels

**Skill Tag Component (Priority 1):**
- Clickable pill/tag linking to skill taxonomy page
- Uses existing tag.scss as foundation
- Scout uniform colors (olive background, white text)
- Hover state indicates clickability

**Eagle-Required Indicator (Priority 1):**
- Brown background (--brown-500), white text
- Variations: corner badge, inline tag, top stripe (test which works best)
- Prominent but not overwhelming
- Consistent placement across all badge cards

**Changelog Display Component (Priority 2):**
- Before/after diff view for requirement text changes
- Clear visual distinction between old and new text
- Date of change prominently displayed
- Per-badge changelog pages use this component

**"Requirements Updated" Indicator (Priority 2):**
- 🆕 badge for badges with changes in last 90 days
- Placed prominently on badge card
- Links to changelog page
- Visual signal without being distracting

**Breadcrumb Navigation (Priority 2):**
- Show taxonomy hierarchy (Skills → Leadership → Camping)
- Always visible, provides escape route
- Implements "never stuck" principle
- Uses existing navigation patterns

### Component Implementation Strategy

**Approach:**
- **Enhance, don't rebuild** - Add Phase 1 metadata to existing components
- **Incremental rollout** - Test on single badge, refine, apply to all 143
- **Reuse existing patterns** - Leverage Hugo partials and SCSS structure
- **Performance first** - Keep per-page CSS minimal, only load what's needed

**Phase 1 Focus:**
Build only what's needed for metadata display (difficulty, time, location, skills, eagle indicator). Defer fancy interactions (hover expand, comparison tables) to Phase 2.

**Testing Strategy:**
- Build components on 2-3 sample badges first
- Validate responsiveness across mobile/tablet/desktop
- Test accessibility (keyboard navigation, screen reader)
- Refine based on testing, then deploy to all 143 badges

### Implementation Roadmap

**Phase 1 - Core Metadata Components (Weeks 1-4):**
- Week 1: Difficulty rating component + time display
- Week 2: Skills tagging component + skill taxonomy pages
- Week 3: Location indicator component + location taxonomy pages
- Week 4: Eagle indicator + changelog components

**Phase 2+ - Enhancement Components (Post-Launch):**
- Requirement explainer component (expandable sections for guidance)
- Comparison table component (Eagle-required optimization)
- "Path to Eagle" builder interface
- Quick filter box for badge lists
- Popular/trending badge indicators

**Component Priority Rationale:**
Phase 1 components enable core user value (discovery via metadata, taxonomy navigation). Enhancement components add delight but aren't critical for launch.


## UX Consistency Patterns

### Button Hierarchy

**Primary Actions:**
- Olive background (--olive-500), tan text
- Used for main actions: "View Requirements," "Browse Badges"
- Bold weight (900), prominent placement
- Hover: darkens to --olive-600

**Secondary Actions:**
- Transparent background, olive border
- Used for alternate actions: "Share," "Save for Later"
- Less prominent than primary

**Text/Tertiary:**
- No border, minimal styling
- Used for inline actions: skill tag links, related badge links
- Inherits link styling

### Navigation Patterns

**Taxonomy Navigation:**
- Clickable skill tags on badge cards link to skill taxonomy pages
- Breadcrumb shows current location in taxonomy hierarchy
- "Back to [category]" always available
- Related badges provide lateral navigation

**Deep Linking:**
- Hover `#` symbol (desktop) or always-visible (mobile) on requirements
- Click copies link to clipboard
- Persistent highlight on deep-linked requirement
- No confirmation modal (smooth, fast)

**"Never Stuck" Pattern:**
- Every page offers multiple next steps
- Related badge suggestions (3-5 badges)
- Breadcrumb navigation to parent taxonomy
- Search always available in header

### Feedback Patterns

**Success Indicators:**
- Visual highlight for deep-linked requirements (persistent)
- Link copied confirmation (clipboard updated, no modal)
- Fast page loads signal progress (<1 second)

**Status Indicators:**
- 🆕 badge for recently updated requirements (last 90 days)
- 🦅 eagle indicator for required badges (brown background)
- Visual metadata always visible (difficulty, time, location)

**Change Awareness:**
- "Requirements updated [date]" prominently displayed
- Changelog link accessible from badge page
- Before/after diff clearly shown on changelog pages

### Search and Filtering

**Full-Text Search (Already Implemented):**
- Search bar in header (always accessible)
- Searches all requirement text across all 143 badges
- Results show matching requirements with deep links

**Quick Filter (Phase 2):**
- Filter badges on current page (reduce scrolling)
- Different from requirements search (filters list, not content)
- Text input with live filtering

**Taxonomy Filtering:**
- Hugo-generated taxonomy pages (static, no JS required)
- Each taxonomy term has dedicated landing page
- Multiple taxonomy navigation paths (skills, difficulty, location)

### Loading and Empty States

**Loading:**
- Static site = no loading states needed (instant page loads)
- Premium wizard (Phase 2+) may need loading indicator

**Empty States:**
- Search with no results: Suggest browsing by taxonomy
- Changelog with no changes: "No changes in last 90 days"
- Related badges when none available: Show popular badges instead

### Error Handling

**404 / Not Found:**
- Clear message with navigation back to browse page
- Suggest search or popular badges

**Broken Deep Links:**
- All requirement IDs valid (generated from data.json)
- System ensures deep links never 404

**Accessibility Errors:**
- Focus indicators always visible (3px minimum)
- Skip links for keyboard navigation
- Alt text on all icons/images

### Interactive States

**Hover States:**
- Badge cards: subtle elevation or border color change
- Buttons: background color darkens
- Links: underline appears or color change
- Deep link `#`: visible on hover (desktop)

**Focus States:**
- High-contrast visible outline (3px, WCAG 2.1 AA)
- No focus outline removal without replacement
- Tab order follows logical reading order

**Active States:**
- Button pressed: slightly darker background
- Taxonomy filter selected: different background color

**Disabled States:**
- Reduced opacity, no cursor pointer
- Clear visual indication element is not interactive

### Consistency Principles

1. **Predictable Interactions** - Same action in different contexts works the same way
2. **Visual Hierarchy** - Most important information always most prominent
3. **Fast Feedback** - User actions get immediate response (<100ms perceived)
4. **Mobile Parity** - No hover-only interactions, touch equivalents always available
5. **Accessibility First** - Keyboard navigation, screen reader support, high contrast built-in from start


## Responsive Design & Accessibility

### Responsive Strategy

**Mobile-First Foundation (Already Implemented):**
- Design starts with mobile (320px+), enhances for larger viewports
- Fluid typography and spacing using clamp() scales naturally
- Container queries enable component-aware responsive design
- No hard breakpoints needed for most layouts

**Device-Specific Strategies:**

**Mobile (320px - 767px):**
- Single-column badge grid
- Stacked navigation (simple, focused)
- `#` deep link symbols always visible (no hover)
- Touch-optimized tap targets (44x44px minimum)
- Metadata stacks vertically on narrow screens
- Skills tags wrap naturally

**Tablet (768px - 1023px):**
- 2-3 column badge grid (container-aware)
- Touch-optimized with keyboard support
- Balanced information density
- Hybrid touch/cursor interactions

**Desktop (1024px+):**
- 3-4 column badge grid
- Hover states active (`#` symbols on hover)
- Full metadata visible inline
- Multi-column layouts for counselor views (optional)
- Keyboard shortcuts available

**Responsive Transformation Examples:**
- Badge cards: Always cards (just different grid columns)
- Navigation: Simple on all devices (no hamburger needed)
- Metadata: Stacks on mobile, inline on desktop
- Deep link `#`: Always visible mobile, hover-only desktop

### Breakpoint Strategy

**Using Existing Fluid Foundation:**
- Fluid spacing (--space-xs through --space-3xl with clamp())
- Fluid typography (--step--2 through --step-6 with clamp())
- Container queries for component-level responsiveness
- Minimal explicit breakpoints needed

**Standard Breakpoints (When Needed):**
- Mobile: 640px (collapse multi-column to single)
- Tablet: 768px (2-column layouts)
- Desktop: 1024px (3+ column layouts, hover interactions)

**Mobile-First Approach:**
- Base styles assume mobile (no media query)
- Enhance with `@media (min-width: ...)` for larger screens
- Progressive enhancement for desktop features

### Accessibility Strategy

**WCAG 2.1 AA Compliance (Required):**

Merit Badge University commits to WCAG 2.1 Level AA compliance across all pages. This is appropriate for educational content serving youth (ages 11-17) and ensures inclusive access.

**Color Contrast (4.5:1 minimum):**
- Text on backgrounds: --olive-500 on --tan-100 meets requirements
- UI components: 3:1 minimum contrast
- No information conveyed by color alone (icons + text, not just color)

**Keyboard Navigation:**
- All interactive elements accessible via Tab key
- Logical tab order follows reading flow
- No keyboard traps
- Skip links provided ("Skip to main content")
- Deep link `#` symbols keyboard accessible

**Screen Reader Support:**
- Semantic HTML (nav, main, article, header, footer)
- ARIA labels on icon-only buttons
- Difficulty stars with aria-label ("Difficulty: 3 out of 5")
- Location icons with text alternatives
- Emoji icons supplemented with aria-label where needed

**Focus Indicators:**
- Visible on all interactive elements (3px minimum)
- High contrast against background
- No focus outline removal without replacement

**Touch Targets:**
- Minimum 44x44px for all interactive elements
- Adequate spacing between tap targets (8px minimum)
- Badge cards large enough for easy tapping

**Progressive Enhancement:**
- Core functionality works without JavaScript
- Deep linking works with native HTML anchors
- Search degrades gracefully if JS fails
- View transitions enhance but aren't required

### Testing Strategy

**Responsive Testing:**
- Chrome DevTools device emulation (all standard devices)
- Physical device testing: iPhone (iOS Safari), Chromebook (Chrome)
- Browser testing: Chrome, Edge, Safari (last 2 versions) - per PRD
- Viewport indicator in dev (already implemented in mockups)

**Accessibility Testing:**
- Lighthouse accessibility audits (target: 100 score)
- VoiceOver screen reader (macOS/iOS) - test emoji announcements
- Keyboard-only navigation (Tab through entire site)
- Color contrast validation tools (WebAIM, Stark)
- WAVE browser extension for quick checks

**Performance Testing:**
- Lighthouse performance audits (target: 90+ score)
- First Contentful Paint < 1.5s (target: <1s)
- Time to Interactive < 3.5s
- Total page weight < 500KB

### Implementation Guidelines

**Responsive Development:**
- Use existing fluid spacing/typography tokens (already optimal)
- Container queries for component-level responsiveness
- CSS Grid with auto-fill for flexible badge grids
- Test on actual devices, not just emulators

**Accessibility Development:**
- Semantic HTML first (nav, main, section, article)
- ARIA labels on decorative icons and emoji
- Focus management for interactive components
- High contrast tested, not just assumed
- Keyboard event handlers alongside mouse events

**Quality Gates:**
- Lighthouse accessibility = 100 (required)
- Lighthouse performance = 90+ (required)
- Manual keyboard navigation passes (required)
- Screen reader test passes on key flows (required)
- Cross-browser visual regression acceptable (required)

