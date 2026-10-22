# Build plan: "Journey Session Sign Up" Rock workflow

Hand this to an AI agent with browser access to Rock (Claude in the browser, or ChatGPT Agent). It describes the goal, the contract with the website, and the build steps. It's a first version for testing; the Rock team will review it.

## Progress (2026-10-14)

- **Step 1 is done.** Workflow type **1968, "Journey Session Sign Up"**, was copied from 1833. It's in the _Group Finder Sign Up Workflows_ category with slug `journey-session-sign-up`. Edit it at `/page/136?WorkflowTypeId=1968`. The Change Log entry was added on 2026-10-13.
- **Steps 2 and 3 are done and saved.** The new Group attributes are `Session1Group` (229472), `Session2Group` (229473) and `Session3Group` (229474). The seven Rock-form actions were removed from Start.
- **Step 4, Session 1 block is done and saved.** "Add to Group" and the four attribute-set actions were deleted. Six "Session 1 - …" actions now sit right after Persist WF (positions 6–11), each with Run If `Session 1 Group` Is Not Blank.
  - In 1833, "Which Campus Regularly Attend" had Run If `Is Class Online?` = True. Decision: replace it with the session filter. The website doesn't send `Whatcampusdoyoumostregularlyattend`, so the value is blank.
- **Step 4, Session 2 and 3 blocks are done and saved.** They follow the same pattern, filtered on `Session 2 Group` and `Session 3 Group`. After the childcare actions were added, Session 2 is at positions 17–22 and Session 3 at 28–33. Start now has 53 actions, with Set Workflow Name at position 39.
- **Step 7 is done and saved.** "Activate Childcare Questions" was removed. It had also been set to complete Start. "Activate Send Confirmation Email" had Run If `Childcare Needed` = No, where Childcare Needed comes from the group's `Childcare` attribute. That filter was cleared so the email always activates.
- **Step 6 is done and saved, with a design change.** The emails didn't read `ClassSchedule`. Each one built `day1`/`day2`/`day3` from `Group`'s `ClassOne`/`ClassTwo`/`ClassThree`, so step 8's assumption was wrong.
  - Both "Set Class Schedule…" actions now output one `<li>` per sent session: the date from the matching `ClassOne`/`ClassTwo`/`ClassThree`, then "EST", the group's campus name and its `ClassLocation`. The "Session N:" / "Sesión N:" label only appears when more than one session was sent. The Spanish version keeps the `M/dd/yy` date format.
  - In "Send English Journey Confirmation Email", "Send Spanish Email" and "Send Online Journey Email", the `{% if day1 … %}` block was replaced with `{{ Workflow | Attribute:'ClassSchedule' }}`. Their `day1`–`day3` assigns are left in place but no longer used.
- **Childcare is handled in Start and saved (decided 2026-10-13).** The native form replaces the Rock childcare form. Each session block is followed by 5 Group Member Attribute Set actions, with Run If `SessionNGroup` Is Not Blank: S1 at 12–16, S2 at 23–27, S3 at 34–38. They copy `0-23Months`, `2Years`, `3Years-4Years`, `5Years-Kindergarten` and `Grades1-5` from the same-named workflow attributes (Single-Select, values `1`–`8`). Childcare need is inferred from whether counts are sent; a count that isn't sent writes a blank.
  - The Childcare Requirements Form activity is now never activated. "Set Childcare", `Childcare Needed` and `WillyouneedChildcare` are unused; flagged for cleanup.
  - Website side (done 2026-10-13): `journey-sessions.ts` loads `Childcare` as `offersChildcare`. The Your Information step asks "Will you need childcare?" only when a selected session offers it, and shows five 0–8 counts after "Yes". `api.journey-sign-up.tsx` sends only counts of 1–8, only when a selected group offers childcare, and returns 400 for out-of-range values. No upcoming three-session group has `Childcare` = True yet, so the question won't show live until one does.
- **Website switched to 1968 (2026-10-13, committed in 3ebf4126).** `api.journey-sign-up.tsx` launches 1968 for every campus, without the 1833/1835 split. It sends `Group` = the earliest selected group at the campus with the most selected sessions, with ties going to the earliest session. The unused `preferredCampusId` hidden input was removed from the Your Information step.
- **Step 8 is checked and needs no change.** The subject line (Defined Value 12571) and the intro and body content (12539, 12528) are static text with no dates. In the three Send actions, the only date output is `ClassSchedule`.
- **Test cases run 2026-10-13 against 1968 from the dev server.** The test person was Daniel Wood, using real upcoming Nov groups because there are no test groups. Case 1 went through the UI; cases 2–4 were posted to the API.
  - Case 1 (workflow 6034164, all three sessions at PBG): pass. One membership with Session1–3 = True; the email lists Session 1/2/3.
  - Case 2 (6034167, S1 at Boca, S2/S3 at Jupiter): pass. `Group` = Jupiter, contact = Austin Warner, memberships in both groups, each with only its own flags. The email was sent from Hello@ChristFellowship.church rather than the contact's address; this needs checking.
  - Case 3 (6034169, only S3 at Stuart): pass. One line with no "Session" label.
  - Case 4 (6034171, CFE PBG S1/S2): pass. Spanish = True, contact John Vanegas, Spanish subject, "Sesión N" lines.
  - Case 5 (repeat launches): pass from case 2 on. The same record was reused and each email lists only its own launch.
  - **Duplicate person, explained (2026-10-14):** case 1 created a duplicate (736475) of 27099. The cause is 27099's Account Protection Profile of Extreme. Rock's Security Settings turn off duplicate checking for Extreme, so Rock never considers that person a match. This is expected for staff with elevated roles; test with a Low or Medium person. Test user Shooter Jackson (401455, profile High) matched correctly (workflow 6036501).
  - **Changed 2026-10-14:** "Match or Create person record" now sets Mobile Number = `PrimaryPhoneNumber` (Cell Phone). It was blank, as in 1833, so matching used only name and email. The phone now counts as a match, which catches people who sign up with a different email.
  - **Issue (existing behavior):** group type 137 has no `Campus` member attribute, so the "Set Home Campus" actions do nothing. Same in 1833.
  - Not tested: childcare counts, because no upcoming group has `Childcare` = True. Also not tested: an online campus.
- **Case 6 run 2026-10-15 from the dev server, with page reloads between launches to match a real return visit.** The test person was Anakin Skywalker (394626), using the Dec PBG group (1773603), where he had no membership.
  - Launch 1 (workflow 6039885, S1 only): one new Active member (9236621) with only `Session1` = True.
  - Launch 2 (6039887, S2 only): pass. Still one member row and one person record. `Session2` was set to True on the existing member about a minute after `Session1`, and the email lists only Dec 13.
  - A first attempt on the Nov PBG group (6039881, 6039883) was inconclusive. Anakin was already a member there from 2026-10-14 with `Session1` and `Session2` already True, so nothing new was written. It did confirm there was no duplicate row.
  - REST launches are queued in Rock: a run can take a minute or more to appear after the website reports success.
  - Not tested: the inactive-member follow-up, because it needs a member set to Inactive by hand.
  - Cleanup done 2026-10-15: Anakin's test memberships 9236621 (Dec PBG), 9235006 (Nov PBG) and 9235007 (Oct PBG) were removed in Rock.
  - Cleanup done: 736475 was merged into 27099, and the test memberships were removed on 2026-10-13.
- **Email formatting fixed 2026-10-22.** Registrations are now one campus (website commit 1c3754d2), so the session lines no longer repeat campus and room, which the emails already print. A pre-fix backup of the Lava was kept outside the repo.
  - Both "Set Class Schedule…" actions now output one `<li>` per sent session with only "Session N:" / "Sesión N:" and the date and time plus "EST". The label always shows, even for one session.
  - In the three Send actions, the Class Details "Campus" line now prints the `Group` campus. It used to print the workflow `Campus` attribute, which "Set Person Campus" sets to the person's home campus when they match an existing record. The Location line was missing `</li>`. The sender (`ConnectionsStaff` of the workflow `Campus`) is unchanged and still follows the home campus; that's a ministry decision.
  - Checked with Rock's Lava render API against workflows 6060319, 6059217, 6060840 (online) and 6034171 (Spanish).
  - Website side: `api.journey-sign-up.tsx` sends `Group` = the earliest selected session's group, rejects sessions at more than one campus with a 400, and no longer sends `hopetoget`.
- Code-editor fields (Lava, email body) are Ace editors. Set them with `ace.edit(el).setValue(v, -1)`, and Rock escapes the hidden textarea automatically.
- Gotchas found while building:
  - An action's Value field (text or attribute) only saves after focusout. Setting it from script needs `.trigger('focusout')`, or it's silently dropped on the next postback or save.
  - New actions are appended to the end. To reorder, use the drag handle, or `__doPostBack('ctl00_main_ctl35_ctl01_ctl06_upDetail', 're-order-action:<data-key>;<index>')`. Inside a script function, call it through `window.location = "javascript:__doPostBack(...)"`, because a direct call throws a strict-mode error.
- How the existing actions are configured:
  - **Add to Group** is a _Group Member Add From Attribute_ action with Person = `Person`, Group = `Group`, Disable Security Groups = No and Ignore Group Member Requirements = No. Its Group Member output is blank.
  - The **member attribute actions** are _Group Member Attribute Set_ actions with Group = `Group`, Person = `Person` and Group Member Attribute Key = e.g. `AtCF`. The value comes from Attribute Value = the matching workflow attribute. The Run If filter is blank.
  - There's no duplicate-action button. Each session block (step 4) is 6 new actions: one Add plus five attribute sets for `SessionN`, `AtCF`, Which Campus Regularly Attend, Home Campus and Reason. Before rebuilding them, open each of the four existing attribute-set actions to copy its key and value.
- Browser tips:
  - Rock's text fields ignore select-all key shortcuts. To replace a value, triple-click the field and then type.
  - The left sidebar's "Workflow Type Search › Name" box is also labeled "Name". Don't type into it by mistake.
  - Actions open only after their parent activity panel is expanded.
  - Saving takes about 10 seconds and then reloads the page.

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
| `AtCF`, `Reason`, `hopetoget`                                 | (existing)        | `hopetoget` is no longer sent (removed from the form 2026-10-15)                                                                         |
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
   - Match or create person (except Mobile Number, added 2026-10-14)
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
| 6   | The same person launched twice in the **same group**: Session 1, then Session 2 | One active membership in that group with `Session1` and `Session2` both True. No duplicate member row.            |

Follow-ups from case 6 (decide or test before go-live):

- **Inactive member.** "Add to Group" skips when any membership exists, whatever its status. If the person was set Inactive in that group, they may get the new `SessionN` flag but stay Inactive, which hides them from the capacity count and the roster. If so, add a "Set member status to Active" action after each Add, with the same Run If.
- **Childcare counts are overwritten.** A count that isn't sent writes a blank, so a later launch for the same group that answers "No" wipes earlier counts. Recommended: add Run If `<count attribute>` Is Not Blank to the 15 childcare actions. AtCF, Reason and Home Campus are also overwritten, which is acceptable.
- **Changing dates.** Booking Session 1 in one group and later in another leaves both memberships flagged. Ministry decision: staff clean this up by hand, or the workflow clears the old flag.

## Website follow-up (separate change, not part of the Rock build)

In `app/routes/api.journey-sign-up.tsx`:

- Switch `workflowTypeId` to the new ID, and drop the 1833/1835 Spanish switch.
- Compute and send `Group` as the primary group.
- Update `app/routes/__tests__/api.journey-sign-up.test.ts` to match.
