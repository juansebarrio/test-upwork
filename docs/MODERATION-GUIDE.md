# Moderating Tea Talks and the contact messages

A short guide for whoever reads what arrives. No technical knowledge needed.

## Signing in

1. Open `https://example.org/admin` in your browser (the real address will be in your welcome note).
2. Type the moderator passphrase and press **Sign in**. Signing in takes about half a second on purpose; that is normal.
3. You are logged out automatically after 30 minutes without activity, and when you close the browser. Press **Log out** (at the right end of the row of tabs) when you finish, especially on a shared computer.

If the passphrase does not work, nothing bad has happened: just try again. Nobody is counting attempts, and nothing is recorded.

**The first time**, there is no passphrase yet. The person who set up the server sends one link that works once, for 24 hours. Open it, choose a passphrase of at least 16 characters, type it twice, and keep it in a password manager: it is never shown again. The link is dead after that. To change the passphrase later, use **Change passphrase** at the bottom of the panel: you type the current one and the new one twice.

## What you see

Four tabs, each with a count:

- **Waiting**: new stories, nobody has decided about them yet.
- **Approved**: stories that can be shown on the public Stories page (if that page is switched on; the line at the bottom of the panel tells you).
- **Rejected**: stories set aside. They are never shown publicly. They stay here until you restore or delete them.
- **Messages**: what people sent through the Contact page.

Each story shows the text and the day it arrived ("Received today", "Received yesterday", or the date). That is genuinely all there is. There is no name, no email, no location, no time of day. If someone asks you "who sent this?", the honest answer is "there is no way to know, and we built it that way on purpose".

## The buttons

| Tab | Button | What it does |
|---|---|---|
| Waiting | **Approve** | Marks the story as approved. If the Stories page is on, it appears there at once, showing only the text and the month it arrived. |
| Waiting | **Reject** | Moves it to Rejected. Nothing is deleted; it is simply never shown. |
| Waiting | **Edit** | Opens the text in a box on the same card. **Save** replaces the text. The original is gone the moment you save: no copy of it is kept anywhere. Then Approve publishes the edited version. **Cancel** closes the box without changing anything. |
| Waiting, Approved, Rejected, Messages | **Delete** | The card asks once, right there, "Delete this for good?" with **Keep it** and **Yes, delete it**. After that there is no recycle bin, no undo, and no copy anywhere. This is deliberate: something that no longer exists cannot be leaked or demanded. |
| Approved | **Unpublish** | Moves the story back to Waiting. It disappears from the Stories page immediately. |
| Rejected | **Restore** | Moves the story back to Waiting. |
| Messages | **Replied** | Erases the way to reply (an address or whatever the person typed) at once. The message text stays until you delete it. Press it as soon as you have answered. Any reply address not marked within 30 days is erased automatically. |

Every button works without JavaScript and with the keyboard alone.

## Editing before approving

Edit only to remove something that could identify a person: a name, a workplace, a street, an exact date, a detail that only one or two people would recognise. Do not reword someone's story to make it "better". If a story needs more than a small removal to be safe, rejecting or deleting it is more honest than rewriting it.

Remember: once you press Save, the original text does not exist anywhere. If you are unsure, Cancel.

## What to look for before approving

Read each story with one question in mind: **could this text point to a real person?** Even without a name, a combination of small details can identify someone in a small community. Look out for:

- names, nicknames, initials
- workplaces, schools, universities, specific shops or cafés
- street names, neighbourhoods, villages, distinctive landmarks
- exact dates ("on 14 March") or unusual events that were in the news
- job titles that only one or two people hold
- descriptions of another person that could identify them, including family members or partners

Spam and junk also arrive sometimes. Delete it. Nothing about it is kept.

## When someone asks for a story to be taken down

Anyone may ask that a story disappear, including the person who wrote it. Because nothing links a story to a person, you cannot check who is asking, so the rule is simple: **if the request describes a story closely enough for you to find it, take it down.**

1. Ask for a phrase from the story, or the month it was published, if the request does not already give one.
2. Open the panel. Look in **Approved** first, then **Waiting** and **Rejected**. Use your browser's find function (Ctrl+F or Cmd+F) with the phrase.
3. Press **Delete** on the card, then **Yes, delete it**. It is gone from the database and from the public page at once.
4. Reply that it has been removed. Do not say anything about who wrote it, because you do not know.

If the request came through the Contact page, press **Replied** afterwards so the reply address is erased.

## Things that keep everyone safer

- Sign in from a device you trust. The panel is protected by a passphrase, but the safest panel is one that is only opened from a trusted phone or laptop.
- Do not take screenshots of the panel or copy stories or messages into chats, documents or emails. The moment a story leaves the panel it is somewhere we cannot delete.
- Do not read the panel on a screen others can see over your shoulder.
- Keep the passphrase in a password manager, not in a note or a message thread.
- If the passphrase may have been seen by someone else, change it from the panel at once. Changing it signs nobody out, so also press Log out on any device you are unsure about.
- Reply to contact messages from an account the collective controls, and press Replied right after.

## What we can and cannot tell people

We can say, truthfully:

- "We do not know who you are."
- "We keep only what you wrote and the day it arrived."
- "When we delete something, it is gone."
- "If you gave us a way to reply, it is erased once we have replied, and in any case after 30 days."

We cannot promise:

- that a story is safe to publish just because it has no name in it. That is exactly what moderation is for.
- that the internet provider or the phone someone used keeps no trace. We control only our own server. The quick exit button and the Safety and Privacy page explain this to visitors.
