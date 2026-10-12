# Build plan: "Journey Session Sign Up" Rock workflow

Hand this to an AI agent with browser access to Rock (Claude in the browser, or ChatGPT Agent). It describes the goal, the contract with the website, and the build steps. It's a first version for testing; the Rock team will review it.

## Ground rules for the agent

- Work only in **Admin › General › Workflows** (`/admin/general/workflows`).
- **Do not edit workflow types 1833 or 1835.** They power the live Journey Finder modal. Copy 1833 and change only the copy.
- Save after each numbered step, and stop to report if a step doesn't match what you see.
- At the end, report the new workflow type ID, plus a list of every attribute and action you added, changed or removed.

## Goal

The website sends one REST launch (`Workflows/LaunchWorkflow/0?workflowTypeId=<new id>`) for each sign-up. That launch can include up to three sessions, and each session can be a different group. The workflow must:

1. Match or create the person once.
2. For each session that was sent, add the person to that group and set the group member attribute `SessionN = True`.
3. Send one confirmation email that lists every session in this launch. It uses English or Spanish depending on the `Group` attribute's campus.

## Input contract (what the website sends)

| Key                                                           | Type to create    | Notes                                                                                                                                    |
| ------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `FirstName`, `LastName`, `PrimaryPhoneNumber`, `EmailAddress` | (existing)        |                                                                                                                                          |
| `AtCF`, `Reason`, `hopetoget`                                 | (existing)        | `hopetoget` is optional                                                                                                                  |
| `LaunchSource`                                                | (existing)        | Always `app`                                                                                                                             |
| `Group`                                                       | (existing, Group) | The "primary" group: most-selected campus, tie goes to the earliest session. Used only for the email, contact, Spanish and online logic. |
| `Session1Group`, `Session2Group`, `Session3Group`             | **new**, Group    | Blank when that session wasn't picked. The number in the key is the session, so no separate `SessionN` boolean is sent.                  |

Session times aren't sent. Read them from each session group's `ClassOne`, `ClassTwo` or `ClassThree` attribute.

## Steps

1. **Copy 1833.** Open "Journey Finder Sign Up - Sign up to Show up" (ID 1833) and use the Copy button. Rename the copy to **Journey Session Sign Up**, keep it in the _Group Finder Sign Up Workflows_ category, and add a Change Log entry saying it was copied from 1833 for the three-session flow.
2. **Add the three new attributes** from the table above.
3. **Remove the Rock-form steps from the Start activity.** These only run for Rock-hosted forms, and this workflow is launched by the API only:
   - Get Person
   - CFDP | Skip Campus Form
   - ONLINE CAMPUS FORM
   - CFDP | Skip User Prompt
   - User Prompt
   - Redirect to new Confirmation page
   - Display Confirmation
4. **Replace the single "Add to Group" with three session blocks.** Delete "Add to Group" and the four "Add … (Group Member Attribute Set)" actions that follow it:
   - AtCF
   - Which Campus Regularly Attend
   - Home Campus
   - Primary Reason

   Then, in the same position, add one block per session N (1, 2, 3). Give each action in the block the run filter **`SessionNGroup` is not blank**:
   - **Group Member Add From Attribute**: Person = `Person`, Group = `SessionNGroup`.
   - **Group Member Attribute Set**: `SessionN` = `True`.
   - **Group Member Attribute Set**: recreate the four you deleted, pointed at `SessionNGroup`.

5. **Keep the group-level Lava on `Group`.** Leave these as they are; they read the primary group, which the website sends as `Group`:
   - Set Is Class Online?
   - Set Is Class in Spanish
   - Set Group Email Address
   - SET Home Campus
6. **Rewrite the class schedule Lava.** Update "Set Class Schedule for Confirmation Email" and its Spanish version so `ClassSchedule` lists one line per session that was sent. Each line shows "Session N", the date and time from that group's matching attribute (`ClassOne`, `ClassTwo` or `ClassThree`), and the campus and location of `SessionNGroup`. Skip blank sessions. If only one session was sent, keep today's behavior of leaving out the word "Session".
7. **Childcare.** Remove "Activate Childcare Questions" from Start. Leave the Childcare activity in place but unused until the Rock team answers the childcare question. Make sure "Activate Send Confirmation Email" still runs from Start.
8. **Check the email activity.** "Send Confirmation Email" should work unchanged, because it reads `Group`, `ClassSchedule`, `IsClassinSpanish` and `IsClassOnline`. Check that both the English and Spanish emails print `ClassSchedule` and don't assume a single class date anywhere else, for example in the subject line from Defined Type 640.
9. **Leave these unchanged:**
   - Match or create person
   - Persist WF
   - Set Workflow Name
   - The SMS actions
   - Is Person Created
   - Update First Connection
   - Original Entry Source
   - Set Person Address
   - Activate Segment API WF

## Test cases (run in Rock, then from the website's dev server)

Use a test person and test or near-future groups of group type 137.

| #   | Launch with                                                                     | Expect                                                                                                            |
| --- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Sessions 1, 2, 3 all at the same campus                                         | Person is a member of 1 to 3 groups, each with only its own `SessionN` flag True. One email lists three sessions. |
| 2   | Session 1 at campus A, Sessions 2 and 3 at campus B, `Group` = a campus B group | Memberships in both groups. The email comes from campus B's contact.                                              |
| 3   | Only Session 3                                                                  | One membership with `Session3 = True`. The email shows a single date with no "Session" label.                     |
| 4   | Sessions at a Español campus, `Group` = that group                              | Spanish email only. The workflow completes.                                                                       |
| 5   | The same person launched twice with different sessions                          | No duplicate person record. The second email lists only the second launch's sessions.                             |

## Website follow-up (separate change, not part of the Rock build)

In `app/routes/api.journey-sign-up.tsx`:

- Switch `workflowTypeId` to the new ID, and drop the 1833/1835 Spanish switch.
- Compute and send `Group` as the primary group.
- Update `app/routes/__tests__/api.journey-sign-up.test.ts` to match.
