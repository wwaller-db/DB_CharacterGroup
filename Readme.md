# DB_CharacterGroup

DB_CharacterGroup was created to solve a problem of interacting with large
numbers of properties across dozens of controllers and layers while creating
character animation in After Effects. It allows animators to create a  Character
null for every character in a composition, then associate properties from any
where else in the comp  to that character. With the character created, a simple
interface allows the user to add key frames to the entire character, remove
keyframes from the character, navigate keyframes on the character, and add or
remove properties. It is also easy to navigate between characters

The tool operates by creating a Null layer for each character created, then
writing a custom comment on that Null that contains a formatted list of
properties associated with the character. All operations are based on this
comment, so the user should not ever edit this comment.



## Installation

Place DB_CharacterGroup.jsx in the After Effects Script UI Panels folder.

>**Windows:**  
>`C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Script\ScriptUI Panels\`  
>**Mac:**  
>`/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/`  

The panel is then launched from the Window menu.

**Important Notes:**  
 1. This script has only been tested in After Effects 2018 & 2019, on OS 10.13.6
 2. I make no claims that this thing won't be the buggiest thing in the world.



##˜ Usage
At the top of the panel is a drop down list of all character nulls in the project.
Use this menu to choose which character null you are acting on. To navigate to
the composition containing a null, choose it in the drop down and click the GO button.

To create a new character group:
 1. Select the properties you want to define as group members.
 2. In the DB_CharacterGroup panel, type in the name of the character group.
    Be sure to make this name unique to the project. Even if the character exists
    in a different comp elsewhere in the project, you'll need to make it unique.
 3. Click the Create button.
 4. A null is created in your comp with a comment full of the properties. DO NOT
    ever edit this comment.

To delete an existing character group:
 1. Type in the exact name of the null you want to delete into the area normally
    used to create characters.
 2. Hold the ALT key, and click the create button.

The Keys section consists of 5 buttons:
  * The + and - buttons add and remove keys to character respectively.
  * The < and > navigate time to the previous and next keys respectively.
  * The KEYS button selects all of the keys near the current time indicator.

The Properties section consists of 3 buttons:
  * The + and - buttons add and remove properties to the character respectively.
  * The PROPS button selects all of the properties associated with the character.


## License

This project is licensed under the MIT License - see the [License.md](License.md) file for details
