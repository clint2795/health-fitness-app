# v08 Product Direction

## Product North Star

A premium hypertrophy and recovery operating system — offline-first, Apple Health-ready, muscle-priority driven, with adaptive training modes.

## Important Workflow Rule

This is NOT PrimeX Finance HQ.

For this app, visual structure and workflow are part of core functionality because it is used live in the gym on mobile.

Do not treat layout/look as decoration. Design structure and workout flow together.

## Core Modules

- Today / Command Centre
- Week / Meso Plan
- Workout Logger
- Exercise Library
- Recovery / Response
- Progress / History
- Mobility / Functional Work
- Settings / Watch Signals

## Design Modes

### Gym / Performance Mode

- black / charcoal / deep navy
- steel/electric blue
- high contrast
- serious, sharp, athletic
- no pastel colours
- no Baymax/wellness look
- no PrimeX biotech clone

### Recovery / Mobility Mode

- calmer
- softer
- more breathing room
- optional pastel allowed only here

### Movement Practice / Tai Chi Mode

- minimal
- calm
- flow-focused
- less data-heavy

## Workout Logger Rules

- offline-first
- save instantly on input/change/save
- never lose sets
- current exercise must be strongest visual element
- current set must be easy to use on mobile
- Change Exercise must preserve planned vs performed
- row/set safety must be preserved until a better proven flow exists
- workout renderer must be rebuilt structurally, not merely styled

## Exercise Library Direction

Each exercise should support:

- parent group
- sub-target
- movement pattern
- equipment
- primary muscles
- secondary muscles
- injury flags
- status: preferred / neutral / conditional / avoid

Shoulders umbrella:

- Side Delts
- Rear Delts
- Front Delts
- Shoulder Health

Legs umbrella:

- Quads
- Hamstrings
- Glutes
- Calves

Include deficit RDL / deadlift pattern as Hamstrings + Glutes with lower-back caution.

## Injury Rule

Injury settings should not remove exercises from the database.

They should warn, grey out, deprioritise, or require confirmation.

## Recovery / Intelligence Layer

Track:

- pump
- soreness
- joints
- recovered on time
- mood
- irritability
- sleep
- fatigue
- training response
- exercise keep/swap feedback

## Future Apple Health / Watch Signals

Design placeholders for:

- sleep
- HRV
- resting HR
- heart rate during workout
- steps
- active energy
- training load
- cardio minutes
- bodyweight
- readiness trend

Do not claim Apple Watch integration exists until implemented.

## Offline / Gym Reliability

- app must work in bad signal
- workout logging must persist locally
- no workflow should depend on internet while training

## Implementation Rule

- build one screen/system at a time
- no broad redesigns
- no styling without structure when structure is the issue
- one commit = one purpose
- inspect before editing
- report exact file paths changed
- do not touch storage/state unless task explicitly asks for it

## Next Build Target

v08.2 Real Workout Renderer Rebuild:

Rebuild the workout screen structure using v08 visual direction while preserving:

- existing data attributes
- save behaviour
- activeSession
- history
- Change Exercise
- set logging
- row-per-set safety
