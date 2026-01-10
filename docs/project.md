# Assignment plan

This exercise is meant to test your ability to generate high-quality code, your ability to handle an open-ended request, your product and design taste, your understanding of LLMs and how they work, and your understanding of LLMs, their strengths as they stand today, and their trajectory.

## Engineering Project

**Calendar Assistant**

You can build a web or mobile interface for this project. If you decide to build a web interface, use React. If you decide to build a mobile interface, use Expo. Through this interface, a user should be able to authenticate a GSuite account, which should be used to pull calendar information. Display this calendar information in a way that makes sense.

Then, there should be a simple chat interface that allows the user to chat with their calendar agent. The user should be able to say things like "I have three meetings I need to schedule with Joe, Dan, and Sally. I really want to block my mornings off to work out, so can you write me an email draft I can share with each of them?" and "How much of my time am I spending in meetings? How would you recommend I decrease that?"

## Problem -> Solution

- Problem: People have a hard time managing their time by trying to keep all the things they need to do in their head
- Solution: A calendar app that lets people make events so they can see what they need to do in one place
  - Make events
  - Can make different profiles
  - Can customise depending on type of event
  - Can share calendar with others
- Limitations with current solutions:
  - Reactive—The calendar can't absorb unexpected changes and ripple them through the rest of your schedule intelligently.
  - Proactive—The calendar can't help you think through what an ideal arrangement looks like, whether for yourself or when coordinating with others.

Reactive problem
→ User-triggered minimal friction input ("running late," "this took longer") with voice or through chat that immediately helps reshuffle your day.

Proactive problem
→ Two components:

- Chat interface for when you want to actively think through your schedule with the agent
- Agent scans daily and suggests events you might need (prep time for deadlines, pattern-based habit adjustments)

## TODO

See [todo.md](todo.md)

## Calendar change preview

### MVP: Inline diff in chat

```
┌─────────────────────────────────────────────┐
│ Claude                                      │
│                                             │
│ I'll move your gym session to the evening   │
│ and add prep time for your essay.           │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Proposed changes                        │ │
│ │                                         │ │
│ │ ✎ Gym                                   │ │
│ │   Mon 7:00am → Mon 6:00pm               │ │
│ │                                         │ │
│ │ + Essay prep                            │ │
│ │   Tue 2:00pm - 4:00pm                   │ │
│ │                                         │ │
│ │ ┌─────────┐ ┌─────────┐                 │ │
│ │ │ Accept  │ │ Decline │                 │ │
│ │ └─────────┘ └─────────┘                 │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Technically requires:**

- A distinct message type for change proposals (separate from regular text messages)
- Proposal card component that renders: change type icon (edit, add, delete), event title, before/after times for moves, just times for new events
- Pending state stored until user accepts or declines
- Accept triggers the actual calendar API calls
- Decline clears the pending state

---

### If time allows: Ghost events on calendar

```
┌────────────────────────────────────────────────────────┐
│ Monday 12th                                            │
│                                                        │
│ ┌──────────────────────┐                               │
│ │░░░░Gym░░░░░░░░░░░░░░░│  ← faded, strikethrough       │
│ │░░░░7:00am - 8:00am░░░│                               │
│ └──────────────────────┘                               │
│                                                        │
│         ...                                            │
│                                                        │
│ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐                               │
│   Gym (proposed)        │  ← dashed border, new pos    │
│ │ 6:00pm - 7:00pm      │                               │
│ └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘                               │
│                                                        │
├────────────────────────────────────────────────────────┤
│ Tuesday 13th                                           │
│                                                        │
│ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐                               │
│   + Essay prep (new)    │  ← dashed, different color   │
│ │ 2:00pm - 4:00pm      │                               │
│ └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘                               │
│                                                        │
└────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 2 pending changes                   │
│ ┌──────────┐ ┌──────────┐           │
│ │ Accept   │ │ Decline  │           │
│ └──────────┘ └──────────┘           │
└─────────────────────────────────────┘
```

**Technically requires:**

- Calendar component accepts a list of "pending events" separate from real events
- Pending events rendered with distinct styling: dashed borders, reduced opacity, different color
- For moves: original event shown faded with strikethrough, new position shown as ghost
- For additions: ghost event at proposed time
- For deletions: existing event shown faded with strikethrough
- Floating action bar appears when pending changes exist
- Calendar auto-scrolls to show affected time ranges
- Shared pending state between chat and calendar components

## Submission instructions

1. **Videos:** [unlisted YouTube videos](https://support.google.com/youtube/answer/157177?hl=en&co=GENIE.Platform%3DDesktop), < 10 min, no scripts and be yourself.
    - Demo what you built, why you built it, tech choices, trade-offs, business impact, and next steps.
2. **Email:** [alex@tenex.co](mailto:alex@tenex.co), [arman@tenex.co](mailto:arman@tenex.co), [dean@tenex.co](mailto:dean@tenex.co), [dan@tenex.co](mailto:dan@tenex.co), [brett@tenex.co](mailto:brett@tenex.co). Ensure subject line is: First Name Last Name | Engineering Take-Home Assignment and include in the body:
    1. YouTube video links
    2. The code on Github with a clear [README.md](http://README.md) explaining how to run/test the code
    3. Deployed/live link
