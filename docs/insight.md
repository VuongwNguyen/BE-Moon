# Lumora – SaaS Story Engine Spec

---

## 1. Core Concept

```yaml
product: Lumora
type: SaaS (Software as a Service)

core_value:
  - create emotional memory experiences
  - transform images into stories
  - enable sharing meaningful moments

galaxy_definition:
  galaxy = memory_space
  memory_space = emotional_story_container
```

---

## 2. System Architecture

```yaml
layers:
  - UI Layer (HTML / optional React)
  - Story Engine (config-driven)
  - Three.js Renderer (visual experience)
  - Backend API (Node + MongoDB)
  - Analytics System

principle:
  - Three.js = rendering engine
  - Story = data + timeline
  - UI = controller
```

---

## 3. Story Types

### Couple Story

```yaml
id: couple

context:
  - love
  - anniversary
  - confession

emotion_flow:
  - intro
  - memories
  - emotional_shift
  - ending

hook_examples:
  - "Chúng ta bắt đầu từ một ngày rất bình thường..."
  - "Anh không nghĩ mọi thứ lại bắt đầu như thế này..."

frames:
  - intro
  - memory_sequence
  - highlight
  - ending
```

---

### Birthday Story

```yaml
id: birthday

context:
  - birthday gift
  - surprise

emotion_flow:
  - greeting
  - memories
  - appreciation
  - celebration

hook_examples:
  - "Hôm nay là ngày đặc biệt của bạn..."
```

---

### Friendship Story

```yaml
id: friendship

context:
  - group memories
  - best friends

emotion_flow:
  - meeting
  - fun moments
  - nostalgia

hook_examples:
  - "Chúng ta đã có những ngày không thể quên..."
```

---

### School Story

```yaml
id: school

context:
  - graduation
  - class memories

emotion_flow:
  - beginning
  - shared moments
  - farewell

hook_examples:
  - "Có những ngày tưởng như bình thường..."
```

---

### Family Story

```yaml
id: family

context:
  - parents
  - family memories

emotion_flow:
  - childhood
  - growth
  - gratitude

hook_examples:
  - "Con không nói nhiều, nhưng..."
```

---

### Self Story

```yaml
id: self

context:
  - personal journey
  - self reflection

emotion_flow:
  - past
  - present
  - hope

hook_examples:
  - "Có những ngày mình chỉ muốn giữ lại..."
```

---

### Travel Story

```yaml
id: travel

context:
  - trip
  - adventure

emotion_flow:
  - start
  - exploration
  - ending

hook_examples:
  - "Chuyến đi này không chỉ là đi..."
```

---

### Special Moment Story

```yaml
id: special

context:
  - proposal
  - milestone

emotion_flow:
  - build_up
  - climax
  - reveal

hook_examples:
  - "Anh đã nghĩ về khoảnh khắc này rất lâu..."
```

---

## 4. Story Timeline Engine

```yaml
timeline:
  - t: 0
    action: fade_in_background

  - t: 2
    action: show_image
    target: image_1

  - t: 5
    action: show_caption
    text: "..."

  - t: 10
    action: camera_zoom

  - t: 15
    action: highlight

  - t: 20
    action: ending
```

---

## 5. Three.js Engine Contract

```yaml
function: initGalaxy(canvas, config)

config_schema:
  storyType: string
  images: array
  captions: array
  music: string
  theme: string
  timeline: array

principle:
  - engine does NOT contain business logic
  - engine only renders based on config
```

---

## 6. UX Flow

```yaml
flow:
  - select_story_type
  - upload_images
  - auto_generate_story
  - preview
  - optional_edit
  - share

important:
  - user should NOT create story from scratch
  - system provides structure
```

---

## 7. Galaxy Context (Multi-tenant)

```yaml
concept:
  galaxy = tenant

rules:
  - all queries must include galaxyId
  - galaxyId must be server-validated
  - do NOT trust client input

middleware_flow:
  - auth
  - resolve_galaxy
  - validate_membership
  - inject_ctx

ctx:
  galaxyId: string
  userId: string
  role: string
```

---

## 8. Security & Data Safety

```yaml
rules:
  - no raw delete (use soft delete)
  - always filter by galaxyId
  - validate user membership

backup:
  - daily snapshot
  - retention: 7-14 days

storage:
  - images stored externally (ImageKit)
  - database stores metadata only
```

---

## 9. Pricing Model

```yaml
free:
  galaxy_limit: 1
  story_types: limited
  features:
    - basic story
    - share link

plus:
  galaxy_limit: 3
  features:
    - more story types
    - customization

pro:
  galaxy_limit: 10
  features:
    - full story types
    - music
    - advanced themes
    - export video (future)
```

---

## 10. Analytics & Feedback System

```yaml
goal:
  - measure emotional engagement
  - optimize storytelling

principles:
  - no sensitive data tracking
  - no content inspection
  - behavior-based tracking only
```

---

### Events

```yaml
story_opened:
  galaxyId: string
  timestamp: number

story_completed:
  galaxyId: string
  duration: number

story_shared:
  galaxyId: string
  method: string

story_interacted:
  galaxyId: string
  type: string
```

---

### Feedback

```yaml
trigger:
  - after story completion

question:
  "Bạn thấy trải nghiệm này thế nào?"

options:
  - 😍 Rất thích
  - 🙂 Ổn
  - 😐 Bình thường
```

---

### Metrics

```yaml
primary:
  - completion_rate
  - share_rate
  - return_rate

secondary:
  - interaction_rate
  - avg_duration
```

---

## 11. Insight Philosophy

```yaml
rules:
  - do not ask users too much
  - behavior > opinion

core_question:
  "User có cảm thấy gì không?"
```

---

## 12. Future Expansion (Ecosystem)

```yaml
stage_1:
  - story experience
  - sharing

stage_2:
  - analytics
  - optimization

stage_3:
  - template system
  - event-based content

stage_4:
  - creator ecosystem
  - marketplace

rule:
  - do NOT build ecosystem too early
```

---

## Final Insight

```yaml
product_truth:
  - users do not buy features
  - users buy emotional value

definition:
  Lumora = emotion engine + story engine
```
