### Assumptions Made
Only residents (USERS) can register for events.
Cancelled registrations can be re-registered.
Event with maxParticipant=null have no capacity limit.
Counter drift could occur since challenge readme explicitly states wanting mutations to affect currentParticipants count instead of always relying on count according to the table ( but that's okay for now )
Benefits outweighed by complexity if we handle duplicate registration prevention at database-level instead of application-level 

### Concurrent Registration Approach
When first approaching concurrent event registration, I had many different thoughts. I examined three potential solutions:

Pre-check Capacity -> When a user registers, simply check to see if capacity is reached, if not, allow in. This solution has a race condition if left as is, and in worst cases, can result in over-registration and disappointed users. It is simple to implement, but has more potential for risk.

Conditional Update with Rollback -> Capacity check occurs at incrementation stage, if we over-register, rollback. This defeats the race condition, and mitigates over-registration, because only one concurrent UPDATE can succeed when at the threshold for capacity. If update fails, rollback and delete registration. This solution was a bit more complex than prior one, and held little risk.

'Holding' Method -> I don't know the actual name for it, but it's a style of event registration where once you enter the registration page, your slot is held/reserved for the next X minutes, at least until you complete registration. For the sake of time, scope, and complexity of this technical, I've decided against implementing this, but I believe it would be the best option to go with past the prototyping stage.

In the end, I chose to move forward with the conditional update solution, as the holding method is too complex considering the purpose of this technical in my opinion (it would exceed scope), and the pre-check capacity is too simple and error-prone compared to conditional updates.

### Duplicate Registration Mitigation
This is done simply at the application level. When first approaching this, I opted for database-level duplicate prevention, but to maintain simplicity and maintainability, made it into an application-level check right before registration insertion.

### CASL and Auth
Auth was a very simple implementation approach, simply added permissions for USERS (residents), and opted to not add permission for guests, managers, admins, etc. My thought process here was that there was no point in managers having specific permissions to register as event participants, since they are the ones managing and facilitating the event anyways. At least, that was my initial thought. I ended up giving 'manage' permissions to all roles above 'User', as it made sense. Given more thought, context, and discussion with the team I'd implement more granularity concerning permissions here.

Concerning redundancy in the actual graphql registration implementation, where we check if 'user' is defined, it is merely done for Type Safety reasons, in the off-chance of 'user' being undefined. Must keep TypeScript happy. Could've done an 'or/and' statement to keep it clean, but I thought it would reduce maintanability by some degree and make it a bit more confusing.

### Optimizations Made
Upon first exploring the code files given, I noticed that the main manner in which we counted participants for events was to check if their participant status was either 'registered' or 'attended'. This was hardcoded throughout the entire file. This was a problem in my eyes because in the scenario of the codebase maturing/evolving past those simple values, developers would have to go to each point in the code where they were calculating event participants that way, and change it accordingly each time.


To rectify this, while keeping the same overall behavior, I replaced the hardcoded checks by adding a single source of truth beneath the enums at the top of the code file. Now, instead of changing the hardcoded checks, they'd simply change the 'ACTIVE_PARTICIPANT_STATUSES' constant, and for the check itself, look to see if their participants had any of the 'ACTIVE_PARTICIPANT_STATUSES' values.

Additionally, found that users could register and unregister after an event has ended or registration deadline passed. I made the decision to implement a fix for this because I didn't think it would make sense to allow users to just go and change their registration statuses on events where deadline to register has passed or event has ended entirely.
