# Candy in Wonderland — Main Character Movement, Directional Facing, and Walking Animation Prompt for Claude

You are working on **Candy in Wonderland**.

This is a focused character movement and animation prompt. Do **not** overhaul the entire game. Do **not** redesign the level. Focus only on making Candy’s movement look and feel natural.

---

## Current Problem

Right now, the main character moves left, right, up, and down, but visually she stays in a standstill pose. She slides around the map instead of looking like she is actually walking.

This must be fixed.

Candy needs:

1. Directional facing
2. Walking animation
3. Idle animation
4. Natural movement transitions
5. Correct sprite flipping or sprite swapping

---

# Main Goal

Make the main character feel alive when moving.

When Candy moves:

- left → she faces left and walks left
- right → she faces right and walks right
- up → she faces up/back and walks upward
- down → she faces down/front and walks downward

When Candy stops moving:

- she should stop walking
- she should keep facing the last direction she moved
- she should use a subtle idle animation instead of looking frozen

---

# Required Direction Logic

Create or fix a direction state.

Use something like:

```ts
type Direction = "up" | "down" | "left" | "right";
```

Track the last movement direction based on input.

Rules:

```ts
if (velocity.x < 0) direction = "left";
if (velocity.x > 0) direction = "right";
if (velocity.y < 0) direction = "up";
if (velocity.y > 0) direction = "down";
```

If the player moves diagonally, choose the dominant axis.

Example:

```ts
if (Math.abs(velocity.x) > Math.abs(velocity.y)) {
  direction = velocity.x < 0 ? "left" : "right";
} else if (Math.abs(velocity.y) > 0) {
  direction = velocity.y < 0 ? "up" : "down";
}
```

When movement stops, keep the last saved direction.

Do not reset Candy to front-facing every time she stops.

---

# Required Sprite Behavior

Use the best available Candy character assets.

If directional sprites exist:

- use front sprite for down
- use back sprite for up
- use left sprite for left
- use right sprite for right

If only one side-facing sprite exists:

- use it for one direction
- flip it horizontally for the other direction

If an up/back sprite does not exist:

- use the closest available back-facing asset
- if no back-facing asset exists, create a temporary visual fallback
- document that a better back-facing sprite may be needed later

If a walking sprite sheet exists:

- use frames for walking animation

If no walking sprite sheet exists:

- create a believable temporary walk animation using transform/position offsets.

---

# Walking Animation Requirements

Candy must visibly animate while walking.

The animation should include:

- slight vertical bob
- alternating step rhythm
- small arm/body movement if sprite frames exist
- subtle shadow squash/stretch
- smooth timing
- no jitter
- no flickering
- no broken scaling

The walk animation should only play while Candy is moving.

When Candy is not moving, use idle animation.

---

# Temporary Animation Fallback

If there are no full walking frames, create a simple procedural animation.

Example behavior:

```ts
const walkCycle = Math.sin(time * walkSpeed);

sprite.y = baseY + Math.abs(walkCycle) * -2;
sprite.rotation = walkCycle * 0.02;
shadow.scaleX = 1 + Math.abs(walkCycle) * 0.08;
shadow.scaleY = 1 - Math.abs(walkCycle) * 0.05;
```

For left/right movement:

- flip the side sprite properly
- do not mirror text or UI
- only flip the character sprite layer

For up/down movement:

- use correct front/back sprite when possible
- add walk bobbing so she does not slide

---

# Idle Animation Requirements

When Candy is standing still:

- keep the last direction
- apply a subtle idle breathing/bobbing animation
- keep the shadow stable
- do not freeze her completely like a static sticker

Example:

```ts
sprite.y = baseY + Math.sin(time * idleSpeed) * 1;
```

Idle animation should be subtle.

---

# Input Compatibility

This must work with all movement inputs:

- mobile joystick
- keyboard controls
- any existing touch controls

Do not make the animation only work for keyboard movement.

Animation should be based on the actual movement vector or player velocity, not just keydown events.

---

# Movement Feel Requirements

Please improve the movement feel while you are here.

Candy should:

- accelerate or move smoothly if the game already supports it
- not jitter
- not snap direction awkwardly
- not moonwalk
- not slide while facing the wrong direction
- not get stuck in a walk frame after stopping
- maintain correct scale across all directions
- stay visually grounded with a shadow

---

# Important: Do Not Break Map Movement

This prompt is about animation and facing, but do not break the movement system.

Preserve:

- collision
- map bounds
- joystick movement
- keyboard movement
- camera follow
- interaction range
- clue collection
- boss unlock logic

---

# Testing Checklist

After implementation, test:

## Direction Facing

- Candy moves left and faces left
- Candy moves right and faces right
- Candy moves up and faces up/back
- Candy moves down and faces down/front
- Candy keeps last direction when stopping

## Walking Animation

- walking animation plays while moving left
- walking animation plays while moving right
- walking animation plays while moving up
- walking animation plays while moving down
- animation stops when movement stops
- idle animation plays while standing

## Mobile Controls

- joystick movement triggers facing changes
- joystick movement triggers walking animation
- attack/interact buttons still work
- UI is not affected

## Stability

- no console errors
- no missing sprite imports
- no broken image paths
- no sprite scaling glitches
- no character disappearing
- no broken collision

---

# Final Report Required

When finished, report:

1. How directional facing was implemented
2. Which Candy sprite assets are being used for each direction
3. Whether left/right uses separate sprites or horizontal flipping
4. How walking animation was implemented
5. How idle animation was implemented
6. Which files were changed
7. Whether joystick and keyboard both work with the animation
8. Anything still needed later, such as better walk-cycle sprite sheets

---

# Final Instruction

Candy should no longer slide around in a static standstill pose.

She must:
- face the direction she moves
- walk with visible animation
- idle naturally when stopped
- work with both joystick and keyboard controls
- preserve all existing gameplay systems
