// Get current project, comp, time, selected layers and properties
function init(){
  proj = app.project;
  if (proj.activeItem!=null){
    currentComp = proj.activeItem;
    currentTime = currentComp.time;
    if (currentComp.selectedLayers.length>0){
      selLyrs = currentComp.selectedLayers;
    }
    if (currentComp.selectedProperties.length>0){
      selProps = currentComp.selectedProperties;
    }
  }
}

// Returns an array containing all the compositions in the project
function getComps(proj){
  var compsInProject=[];
  for (var i=1; i<=proj.items.length; i++){
    if (proj.items[i] instanceof CompItem){
      compsInProject.push(proj.items[i]);
    }
  }
  return compsInProject;
}

// Receives a comp name string, returns its index in the project
function getCompIndex(compName){
  for (var i = 1; i <= app.project.numItems; i ++) {
    if ((app.project.item(i) instanceof CompItem) && (app.project.item(i).name === compName)) {
        return i;
    }
  }
}

// Receives an array of comps, returns an array of Null layers that have been created
// by DB_CharacterGroups
function getAllCharNulls(comps){
  var charNulls=[];
  for (var c=0; c < comps.length; c++){
    var searchComp = comps[c];
    //Iterate layers in search comp
    for (var l=1; l <= searchComp.numLayers; l++){
      var searchLayer = searchComp.layers[l];
      //Check if search Layer is a a DBCG null
      if(searchLayer.nullLayer){
        var res = searchLayer.comment.split("****");
        if(res[0]==="DBCG"){
          //Add the layer to the resulting array
          charNulls.push(searchLayer.name);
        }
      }
    }
  }
  return charNulls;
}

// Refreshes the DB_CharacterGroup script and all associated objects.
function refreshDBCG(){
  //Collect all comps in project
  var compsInProject = getComps(app.project);
  //Iterate comps
  for (var c=0; c < compsInProject.length; c++){
    var searchComp = compsInProject[c];
    //Iterate layers in search comp
    for (var l=1; l <= searchComp.numLayers; l++){
      var searchLayer = searchComp.layers[l];
      //Check if search Layer is a a DBCG null
      if(searchLayer.nullLayer){
        var res = searchLayer.comment.split("****");
        if(res[0]==="DBCG"){
          deselectAllProps(searchComp);
          //It is a DBCG null. Extract property names from comment
          var propNames = extractPropNamesFromComment(res[1]);
          for (var p=0; p < propNames.length; p++){
            var propName = propNames[p];
            eval("searchComp." + propName + ".selected = true");
          }
        // Create an object for the null
        createCGObject(searchLayer.name,searchComp.selectedProperties,searchComp);
        }
      }
    }
  }
  refreshUI();
}

// Updates the drop down menu and create character text box in the Character Group UI
function refreshUI(){
  //Initialize some variables
  var ddSelection = null;
  var existingSelection = false;
  var characterList = dbcgUI.pnl_main.grp_characterSelect.dwn_charSelect;
  var createCharacterText = dbcgUI.pnl_CreateRefresh.grp_create.edit_create;
  //Check if the drop down list is populated and if there is anything selected
  if (characterList.items.length>0){
    if (characterList.selection != null){
      //If so, set ddSelection to the text of the selected item.
      existingSelection = true;
      var ddSelection = characterList.selection.toString();
    }
  }
  //Clear the drop down list
  characterList.removeAll();
  //Search for all character nulls in the project
  var charactersFound = getAllCharNulls(getComps(app.project));
  //Iterate those nulls and add them to the drop down list.
  for (var i=0; i < charactersFound.length; i++){
    characterList.add("item", charactersFound[i]);
    //If there was a selection when refresh was called, restore that select.
    if (existingSelection === true){
      if (charactersFound[i] == ddSelection){
        characterList.selection = characterList.items[i];
      }
    }
  }
  //clear the create character text box.
  createCharacterText.text = "";
}

// Returns a given string's index in a given drop down list
function getDdIndex(dd,searchString){
  for (var i=0; i < dd.items.length; i++){
    if(dd.items[i].toString() == searchString){
      return[i];
    }
  }
}

// Updates the comment on a character group null.
function refreshNullComment(cgNull){
  cgNull.locked=false;
  cgNull.comment="";
  cgNull.comment = "DBCG****";
  cgNull.comment += buildMainPropString(eval(cgNull.name));
  cgNull.locked=true;
}

// Switches between creating a character and deleting a character based on
// state of the alt key.
function createClicked(cgName,props,targetComp,altState){
  if (altState!=true){
    createCharacter(cgName,props,targetComp);
  } else {
    deleteCharacter(dbcgUI.pnl_CreateRefresh.grp_create.edit_create.text);
  }
}

// Creates a new character group given a name, some selected properties and a target comp
function createCharacter(cgName,props,targetComp){
  try {
    app.beginUndoGroup("Create Character Group");
    //Create the object and the null
    createCGObject(cgName,props,targetComp);
    createCGNull(cgName,props,targetComp);
  }
  catch (err) {
    alert("Creating a character failed: " + err.toString());
  }
  finally {
    //Do some UI clean up
    refreshUI();
    var characterList = dbcgUI.pnl_main.grp_characterSelect.dwn_charSelect;
    characterList.selection = characterList.items[getDdIndex(characterList,cgName)];
    app.endUndoGroup();
  }
}

// Creates an object for the charater
function createCGObject(cgName,props,targetComp){
  if (typeof cgName != "object"){
    newCG = eval(cgName+"={properties:[]}");
    newCG.comp = targetComp.name;
    addPropsToCGObject(newCG, props);
  }
}

// Creates the DBCG Null Layer with a given name, a comment on the layer from the
// given selected propserties, inside the given comp.
function createCGNull(cgName,props,targetComp){
  var checkIfExists = false;
  // Build list of existing character nulls
  var existingCharacterNulls = getAllCharNulls(getComps(app.project));
  // If any of those arrays are the same name as the character we are creating
  // set flag to true
  for (var i=0; i<=existingCharacterNulls.length; i++){
    if(existingCharacterNulls[i] === cgName){
      checkIfExists = true;
    }
  }
  // If no existing nulls with that name, create one.
  if(!checkIfExists){
    //create a null with correct name
    var newNull = targetComp.layers.addNull();
    newNull.transform.position.setValue([0,0]);
    newNull.name = cgName;
    newNull.enabled = false;
    newNull.shy = true;
    // Then write it's DBCG comment
    refreshNullComment(eval(newNull));
  } else {
    throw new Error("A character already exists with the name: "+cgName+". If this is a character that occurs in multiple shots, try adding a shot number to the name.");
  }
}

// Removes an existing DBCG Null of a given name
function deleteCharacter(cgName){
  app.beginUndoGroup("Delete Character Group");
  var nullToDelete = getCharNull(cgName)[0].name;
  var compIndex = getCompIndex(getCharNull(cgName)[1].name);
  eval("app.project.item(" + compIndex + ").layer(\""+nullToDelete+"\").locked = false");
  eval("app.project.item(" + compIndex + ").layer(\""+nullToDelete+"\").remove()");
  refreshUI();
  app.endUndoGroup();
}

// Split a given DBCG comment into its individual property match names
function extractPropNamesFromComment(propString){
  var extractedProperties = propString.split("||");
  return extractedProperties;
}

// Adds selected properties to a given DB Character group object
function addPropsToCGObject(cgName,propsToAdd){
  // Check that properties were provided
  if (propsToAdd.length>0){
    // Check that selected properties aren't already in the group.
    // Initialize array of properties to ignore
    var propsToIgnore = [];
    // Iterate through properties to add
    for (var p=0; p < propsToAdd.length; p++){
      prop = propsToAdd[p];
      // For each property to add, iterate through existing properties.
      if (prop.propertyType === PropertyType.PROPERTY){
        for (var i=0; i < cgName.properties.length; i++){
          // Use build prop string to compare each existing prop to the prop to add.
          // If their full match names are the same, push the prop to add to the propsToIgnore array.
          if (buildSinglePropString(prop) == buildSinglePropString(cgName.properties[i])){
            alert(buildSinglePropString(prop) + "is already a property of this group");
            propsToIgnore.push(p);
          }
        }
      }
    }
    // Iterate through the props to ignore list and remove those from props to add.
    for (var i=0; i < propsToIgnore.length; i++){
      propsToAdd.splice(i,1);
    }
    // Finally, iterate through the propsToAdd list and push them to the objects properties
    // attribute.
    for (var p=0; p < propsToAdd.length; p++){
      prop = propsToAdd[p];
      if (prop.propertyType === PropertyType.PROPERTY){
        cgName.properties.push(prop);
      }
    }
  } else {
    throw new Error("No properties were selected.");
  }
}

// Function called by the add props button. Calls Add props to object and refreshes
// the associated null's DBCG comment.
function addProps(cgName,propsToAdd){
  try {
    app.beginUndoGroup("Add Properties to Character Group");
    addPropsToCGObject(eval(cgName),propsToAdd);
    var targetNull = getCharNull(cgName)[0];
    refreshNullComment(targetNull);
  }
  catch(err){
    alert("Add Properties failed: " + err.toString());
  }
  finally{
    refreshDBCG();
    app.endUndoGroup();
  }
}

// Removes selected properties to a given DB Character group object
function rmPropsFromCGObject(cgName,propsToRemove){
  // Initialize a counter
  var numRemoved = 0;
  // Iterate through props to remove
  for (p=0; p< propsToRemove.length; p++){
    var prop = propsToRemove[p];
    // Build the match name string for each propety.
    var stringToFind = buildSinglePropString(prop);
    // Iterate through the properties in the character group.
    for (i=cgName.properties.length-1; i>=0; i--){
      // For each property in the group build a match name string and compare it to
      // stringToFind
      if (buildSinglePropString(cgName.properties[i])===stringToFind){
        // Splice out any matching properties
        var removedProp = cgName.properties.splice(i,1);
        numRemoved += 1;
      }
    }
  }
  if (numRemoved === 0){
    alert("No member properties were removed.");
  }
}

// Function called by the remove props button. Calls remove props from object and refreshes
// the associated null's DBCG comment.
function rmProps(cgName, propsToRemove){
  try{
    app.beginUndoGroup("Remove Properties from Group");
    rmPropsFromCGObject(eval(cgName),propsToRemove);
    var targetNull = getCharNull(cgName)[0];
    refreshNullComment(targetNull);
  }
  catch(err){
    alert("Remove Properties failed: "+err.toString());
  }
  finally {
    refreshDBCG();
    app.endUndoGroup();
  }
}

// Builds a string containing the full path to a given property, relative to the comp its in.
function buildSinglePropString(prop){
  // Start at the deepest point of the path by just building the match name of the prop.
  var propString = "(\""+prop.matchName+"\")";
  // Find the depth of that property
  var depth = prop.propertyDepth;
  // For every level of depth,
  for (var i=1; i < depth; i++){
    // Add the current prop's parent's match name to the existing propString
    propString = "(\""+prop.parentProperty.matchName+"\")"+ propString;
    // Then set prop to its own parent property. This will build the name from
    // deepest point to the shallowest, until the loop ends
    prop = prop.parentProperty;
  }
  // At the end of the loop, add the layers match name to the front of the propString
  propString = "layer(\""+prop.parentProperty.name+"\")"+ propString;
  return propString;
}

// Uses buildSingPropString to create a long main string containing ALL the props
// of the character group
function buildMainPropString(characterGroup){
  mainPropString = "";
  // For every property in the group
  for (var p = 0; p < characterGroup.properties.length; p++){
    // Append the single prop string
    mainPropString += buildSinglePropString(characterGroup.properties[p]);
    // If its not the end of the list of properties,
    if (p < characterGroup.properties.length-1){
      // Add double pipes as a seperator
      mainPropString += "||";
    }
  }
  return mainPropString;
}

// Adds key frames to every property in a character at the comps current time
function addKeyToCharacter(cgName){
  try{
    if (cgName.properties.length>0){
      app.beginUndoGroup("Add Key to Character");
      var compName = cgName.comp;
      var compIndex = getCompIndex(compName);
      var currentTime = app.project.item(compIndex).time;
      for (var i=0; i < cgName.properties.length; i++){
        var prop = cgName.properties[i];
        eval("app.project.item(" + compIndex +")." + buildSinglePropString(prop) + ".addKey(" + currentTime +")");
      }
    } else {
      throw new Error("This character group has no properties.");
    }
  }
  catch(err){
    alert("Add keys to character failed: "+err.toString());
  }
  finally{
    app.endUndoGroup();
  }
}

// Removes key frames from every property in a character at the comps current time
function removeKeyFromCharacter(cgName){
  try{
    if(cgName.properties.length>0){
      app.beginUndoGroup("Remove Keys from Character");
      var compName = cgName.comp;
      var compIndex = getCompIndex(compName);
      var currentTime = app.project.item(compIndex).time;
      for (var i=0; i < cgName.properties.length; i++){
        var prop = cgName.properties[i];
        // Find the index of the keyframe closest to the current time.
        var nearestIndex = eval("app.project.item(" + compIndex +")." + buildSinglePropString(prop) + ".nearestKeyIndex(" + currentTime +")");
        // Get the time of that key
        var keyTime = eval("app.project.item(" + compIndex +")." + buildSinglePropString(prop) + ".keyTime(" + nearestIndex +")");
        // How far away from the current time is thta key?
        var distToKey = Math.abs(currentTime-keyTime);
        // If its less that .005 seconds away
        if (distToKey < .005){
          // Delete it
          eval("app.project.item(" + compIndex +")." + buildSinglePropString(prop) + ".removeKey(" + nearestIndex +")");
        }
      }
    } else {
      throw new Error("This character group has no properties.");
    }
  }
  catch(err){
    app.endUndoGroup();
    alert("Remove keys failed: "+err.toString());
  }
}

// Jumps time to the next keyframe in the character group
function keyNavNext(cgName){
  init();
  var targetProp="";
  var targetTime=0;
  var distToKeyLast = null;
  //iterate through props of group and find nearest next key index for each prop
  for (var i=0; i < cgName.properties.length; i++){
    var prop = cgName.properties[i];
    if (eval("currentComp." + buildSinglePropString(prop) + ".numKeys") !=0 ){
      var nearestIndex = eval("currentComp." + buildSinglePropString(prop) + ".nearestKeyIndex(" + currentTime +")");
      var keyTime = eval("currentComp." + buildSinglePropString(prop) + ".keyTime(" + nearestIndex +")");
      if (keyTime > currentTime){
        var distToKey = keyTime - currentTime;
        if (distToKey < distToKeyLast|| distToKeyLast===null) {
          targetProp = prop;
          targetTime = keyTime;
        }
        distToKeyLast=distToKey;
      }
    }
  }
  if (distToKeyLast != null){
    app.project.activeItem.time=targetTime;
  }
  return(cgName);
}

// Jumps time to the previous keyframe in the character group
function keyNavPrev(cgName){
  init();
  var targetProp="";
  var targetTime=0;
  var distToKeyLast = null;
  //iterate through props of group and find nearest next key index for each prop
  for (var i=0; i < cgName.properties.length; i++){
    var prop = cgName.properties[i];
    if (eval("currentComp." + buildSinglePropString(prop) + ".numKeys") !=0 ){
      var nearestIndex = eval("currentComp." + buildSinglePropString(prop) + ".nearestKeyIndex(" + currentTime +")");
      var keyTime = eval("currentComp." + buildSinglePropString(prop) + ".keyTime(" + nearestIndex +")");
      if (keyTime < currentTime){
        var distToKey = currentTime - keyTime;
        if (distToKey < distToKeyLast|| distToKeyLast===null) {
          targetProp = prop;
          targetTime = keyTime;
        }
        distToKeyLast=distToKey;
      }
    }
  }
  if (distToKeyLast != null){
    app.project.activeItem.time=targetTime;
  }
  return(cgName);
}

// Selects all keys near current time indicator for a given character group
function selectKeys(cgName){
  try{
    if(cgName.properties.length>0){
      var compName = cgName.comp;
      var compIndex = getCompIndex(compName);
      var currentTime = app.project.item(compIndex).time;
      for (var i=0; i < cgName.properties.length; i++){
        var prop = cgName.properties[i];
        // Find the index of the keyframe closest to the current time.
        var nearestIndex = eval("app.project.item(" + compIndex +")." + buildSinglePropString(prop) + ".nearestKeyIndex(" + currentTime +")");
        // Get the time of that key
        var keyTime = eval("app.project.item(" + compIndex +")." + buildSinglePropString(prop) + ".setSelectedAtKey(" + nearestIndex +",true)");
        // How far away from the current time is thta key?
        var distToKey = Math.abs(currentTime-keyTime);
        // If its less that .005 seconds away
        if (distToKey < .005){
          // Select it
          alert(distToKey);
          eval("app.project.item(" + compIndex +")." + buildSinglePropString(prop) + ".keySelected(" + nearestIndex +")");
        }
      }
    } else {
      throw new Error("This character group has no properties.");
    }
  }
  catch(err){
    alert("Remove keys failed: "+err.toString());
  }
}

// Returns the layer and comp objects associated with a given character group
function getCharNull(cgName){
  // Get all comps in project
  var comps = getComps(app.project)
  // Iterate through comps
  for (var c=0; c < comps.length; c++){
    var searchComp = comps[c];
    //Iterate layers in search comp
    for (var l=1; l <= searchComp.numLayers; l++){
      var searchLayer = searchComp.layers[l];
      //Check if search Layer is a a DBCG null
      if(searchLayer.nullLayer){
        var res = searchLayer.comment.split("****");
        if(res[0]==="DBCG"){
          if(searchLayer.name===cgName){
            return [searchLayer,searchComp];
          }
        }
      }
    }
  }
}

// Opens a destination comp in the comp viewer
function goToCharNull(cgName){
  var destComp=getCharNull(cgName)[1];
  destComp.openInViewer();
}

// Selects all props in a character group
function selectAllProps(cgName){
  var props = eval(cgName + ".properties");
  for (var i=0; i < props.length; i++){
    props[i].selected = true;
  }
}

// Clears any selected properties in a given comp
function deselectAllProps(targetComp){
  for(var i=0; i < targetComp.selectedProperties.length; i++){
    prop = targetComp.selectedProperties[i];
    prop.selected = false;
  }
}

// For Debugging.
function propList(cgName){
  charNull = getCharNull(cgName)[0];
  var res = charNull.comment.split("****");
  if(res[0]==="DBCG"){
    //It is a DBCG null. Extract property names from comment
    var commentProps = extractPropNamesFromComment(res[1]);
  }
  alert(commentProps);
  var objectProps = eval(cgName + ".properties");
  var objectPropNames=[];
  for (var i=0; i < objectProps.length; i++){
    objectPropNames.push(objectProps[i].name);
  }
  alert(objectPropNames);
}

// Checks if the Alt key is pressed.
function altState(){
  var ks = ScriptUI.environment.keyboardState;
  if(ks.altKey==true){
    return true;
  } else {
    return false;
  }
}


/* ---------------- UI --------------------*/

// UI Resource string
var resString =
"group{orientation:'column',alignment:['fill','fill'],\
  pnl_main:Panel{orientation:'column', alignment:['fill','fill'],\
    grp_characterSelect:Group{orientation:'row',\
      lbl_charSelect:StaticText{text:'Character:'},\
      dwn_charSelect:DropDownList{preferredSize:[150,-1]},\
      btn_go:Button{text:'Go',},\
    },\
    grp_keys:Group{orientation:'row',\
      btn_keyPrev:Button{text:'<',preferredSize:[25,25]},\
      btn_keySub:Button{text:'-',preferredSize:[25,25]},\
      btn_keySel:Button{text:'Keys',preferredSize:[70,25],justify:'center'},\
      btn_keyAdd:Button{text:'+',preferredSize:[25,25]},\
      btn_keyNext:Button{text:'>',preferredSize:[25,25]},\
    },\
    grp_props:Group{orientation:'row',\
      btn_propSub:Button{text:'-',preferredSize:[25,25]},\
      btn_propSel:Button{text:'Properties',preferredSize:[70,25],justify:'center'},\
      btn_propAdd:Button{text:'+',preferredSize:[25,25]},\
    },\
  },\
  pnl_CreateRefresh:Panel{orientation:'column', alignment:['fill','fill'],\
    grp_create:Group{orientation:'row',alignment:['center','center'],\
      lbl_create:StaticText{text:'Create Character:'},\
      edit_create:EditText{characters:15},\
      btn_create:Button{text:'Create'},\
    },\
    grp_refresh:Group{orientation:'row',alignment:['center','center'],\
      btn_refresh:Button{text:'Refresh',preferredSize:[65,25]},\
    },\
  },\
}";

// Tooltips
var toolTips = {
  tt_charDropDown: "Use this list to interact with all existing characters in a project.",
  tt_goBtn: "Go to the composition containing the selected character.",
  tt_keyNavPrev: "Jump to previous key on character.",
  tt_keyNavNext: "Jump to previous key on character.",
  tt_keyAdd: "Create a keyframe at current time.",
  tt_keyRmv: "Remove a keyframe at current time.",
  tt_propAdd: "Add selected properties to the character.",
  tt_propRmv: "Remove selected properties from character.",
  tt_createEditText: "Enter the name and press create to create this character. Enter a name, Alt - click button to delete an existing character.",
  tt_create: "Click to create character. Alt - Click to delete character.",
}

// Create UI
function createUserInterface (thisObj, userInterfaceString, scriptName){
  var pal = (thisObj instanceof Panel) ? thisObj : new Window("palette", scriptName, undefined, {resizeable: true});
  if (pal == null) return pal;

  var UI = pal.add(userInterfaceString);

  pal.layout.layout(true);
  pal.layout.resize();
  pal.onResizing = pal.onResize = function () {
    this.layout.resize();
  }
  if ((pal != null) && (pal instanceof Window)){
    pal.show();
  }
  return UI;
};

var dbcgUI = createUserInterface(this,resString, "DB Character Group");

// UI Functionality
dbcgUI.pnl_CreateRefresh.grp_refresh.btn_refresh.onClick=function(){refreshUI()};
dbcgUI.pnl_CreateRefresh.grp_create.btn_create.onClick=function(){createClicked(dbcgUI.pnl_CreateRefresh.grp_create.edit_create.text,app.project.activeItem.selectedProperties,app.project.activeItem,altState())};
dbcgUI.pnl_main.grp_characterSelect.btn_go.onClick=function(){goToCharNull(dbcgUI.pnl_main.grp_characterSelect.dwn_charSelect.selection.text)};
dbcgUI.pnl_main.grp_keys.btn_keyAdd.onClick=function(){addKeyToCharacter(eval(dbcgUI.pnl_main.grp_characterSelect.dwn_charSelect.selection.text))};
dbcgUI.pnl_main.grp_keys.btn_keySub.onClick=function(){removeKeyFromCharacter(eval(dbcgUI.pnl_main.grp_characterSelect.dwn_charSelect.selection.text))};
dbcgUI.pnl_main.grp_keys.btn_keyNext.onClick=function(){keyNavNext(eval(dbcgUI.pnl_main.grp_characterSelect.dwn_charSelect.selection.text))};
dbcgUI.pnl_main.grp_keys.btn_keyPrev.onClick=function(){keyNavPrev(eval(dbcgUI.pnl_main.grp_characterSelect.dwn_charSelect.selection.text))};
dbcgUI.pnl_main.grp_keys.btn_keySel.onClick=function(){selectKeys(eval(dbcgUI.pnl_main.grp_characterSelect.dwn_charSelect.selection.text))};
dbcgUI.pnl_main.grp_props.btn_propAdd.onClick=function(){
  init();
  addProps(dbcgUI.pnl_main.grp_characterSelect.dwn_charSelect.selection.text,selProps);
};
dbcgUI.pnl_main.grp_props.btn_propSub.onClick=function(){
  init();
  rmProps(dbcgUI.pnl_main.grp_characterSelect.dwn_charSelect.selection.text,selProps);
};
dbcgUI.pnl_main.grp_props.btn_propSel.onClick=function(){selectAllProps(dbcgUI.pnl_main.grp_characterSelect.dwn_charSelect.selection.text.toString())}

refreshDBCG();
