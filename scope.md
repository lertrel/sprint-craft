Theme: MVP2 - Preparation for multi-player phase (continue)
Goals:
Dynamic Username
	⁃	When the game load at first, display a dialog box with label (Choose avatar name), textbox (user name), and button (OK) for user to choose avatar name. 
	⁃	User can press OK with or without enter username, once pressed the dialog box disappears. Mark value from the textbox as {textbox-value}
	⁃	{username} = trim({textbox-value})
	⁃	If {username} is blank, {username} = getAnonymousUserName()
	⁃	getAnonymousUserName is a mock function return ‘User 1’
	⁃	In later phase, getAnonymousUserName will connect to a host server to obtain a unique anonymous user name.
	⁃	Assign {username} to avatar’s nameplate from previous iteration
Enhance Avatar Appearance
** Torso Color **
	⁃	Torso should have different color with the test of the body to symbolize ‘cloth’. Choose color that can be easily differentiate from all blocks and sky as a default color for this phase. Mark it as {default-color}
	⁃	Prepare option to specify avatar color when it first create
	⁃	Assign {default-color} to the torso when the avatar firstly created
	⁃	Unless explicitly re-assigned, torso color will not change even after re-spawn
	⁃	No interface or command to change torso color in this phase
	⁃	Torso color will not be persisted in local DB in this phase
** Face **
	⁃	Frontal side of the head, should have different color than torso and the rest of the body to symbolize ‘face’. Verify if beige works or suggest a proper color
	⁃	Place eyes on frontal side of the head (color black)

