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

function getComps(proj){
  var compsInProject=[];
  for (var i=1; i<=proj.items.length; i++){
    if (proj.items[i] instanceof CompItem){
      compsInProject.push(proj.items[i]);
    }
  }
  return compsInProject;
}

function getCompIndex(compName){
  for (var i = 1; i <= app.project.numItems; i ++) {
    if ((app.project.item(i) instanceof CompItem) && (app.project.item(i).name === compName)) {
        return i;
    }
  }
}

function getCharNulls(comps){
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
          charNulls.push(searchLayer.name);
        }
      }
    }
  }
  return charNulls;
}

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
        createCGObject(searchLayer.name,searchComp.selectedProperties,searchComp);
        }
      }
    }
  }
  refreshUI();
}

function refreshUI(){
  var ddSelection = null;
  var existingSelection = false;
  var characterList = dbcgUI.pnl_main.grp_characterSelect.dwn_charSelect;
  var createCharacterText = dbcgUI.pnl_CreateRefresh.grp_create.edit_create;
  if (characterList.items.length>0){
    if (characterList.selection != null){
      existingSelection = true;
      var ddSelection = characterList.selection.toString();
    }
  }
  characterList.removeAll();
  var charactersFound = getCharNulls(getComps(app.project));
  for (var i=0; i < charactersFound.length; i++){
    characterList.add("item", charactersFound[i]);
    if (existingSelection === true){
      if (charactersFound[i] == ddSelection){
        characterList.selection = characterList.items[i];
      }
    }
  }
  createCharacterText.text = "";
}

function getDdIndex(dd,searchString){
  for (var i=0; i < dd.items.length; i++){
    if(dd.items[i].toString() == searchString){
      return[i];
    }
  }
}

function refreshNullComment(cgNull){
  cgNull.locked=false;
  cgNull.comment="";
  cgNull.comment = "DBCG****";
  cgNull.comment += buildMainPropString(eval(cgNull.name));
  cgNull.locked=true;
}

function createClicked(cgName,props,targetComp,altState){
  if (altState!=true){
    createCharacter(cgName,props,targetComp);
  } else {
    deleteCharacter(dbcgUI.pnl_CreateRefresh.grp_create.edit_create.text);
  }
}

function createCharacter(cgName,props,targetComp){
  try {
    app.beginUndoGroup("Create Character Group");
    createCGObject(cgName,props,targetComp);
    createCGNull(cgName,props,targetComp);
  }
  catch (err) {
    alert("Creating a character failed: " + err.toString());
  }
  finally {
    refreshUI();
    var characterList = dbcgUI.pnl_main.grp_characterSelect.dwn_charSelect;
    characterList.selection = characterList.items[getDdIndex(characterList,cgName)];
    app.endUndoGroup();
  }
}

function createCGObject(cgName,props,targetComp){
  if (typeof cgName != "object"){
    newCG = eval(cgName+"={properties:[]}");
    newCG.comp = targetComp.name;
    addPropsToCGObject(newCG, props);
  }
}

function createCGNull(cgName,props,targetComp){
  var checkIfExists = false;
  var existingCharacterNulls = getCharNulls(getComps(app.project));
  for (var i=0; i<=existingCharacterNulls.length; i++){
    if(existingCharacterNulls[i] === cgName){
      checkIfExists = true;
    }
  }
  if(!checkIfExists){
    //create a null with correct name
    var newNull = targetComp.layers.addNull();
    newNull.transform.position.setValue([0,0]);
    newNull.name = cgName;
    newNull.enabled = false;
    newNull.shy = true;
    // newNull.comment="DBCG****"
    // newNull.comment += buildMainPropString(eval(cgName));
    refreshNullComment(eval(newNull));
  } else {
    throw new Error("A character already exists with the name: "+cgName+". If this is a character that occurs in multiple shots, try adding a shot number to the name.");
  }
}

function deleteCharacter(cgName){
  app.beginUndoGroup("Delete Character Group");
  var nullToDelete = getCharNull(cgName)[0].name;
  var compIndex = getCompIndex(getCharNull(cgName)[1].name);
  eval("app.project.item(" + compIndex + ").layer(\""+nullToDelete+"\").locked = false");
  eval("app.project.item(" + compIndex + ").layer(\""+nullToDelete+"\").remove()");
  refreshUI();
  app.endUndoGroup();
}

function extractPropNamesFromComment(propString){
  var extractedProperties = propString.split("||");
  return extractedProperties;
}

function addPropsToCGObject(cgName,propsToAdd){
  if (propsToAdd.length>0){
    //remove any existing props
    var propsToIgnore = [];
    for (var p=0; p < propsToAdd.length; p++){
      prop = propsToAdd[p];
      if (prop.propertyType === PropertyType.PROPERTY){
        for (var i=0; i < cgName.properties.length; i++){
          //var propExistsOnCG = false;
          if (buildSinglePropString(prop) == buildSinglePropString(cgName.properties[i])){
            alert(buildSinglePropString(prop) + "is already a property of this group");
            propsToIgnore.push(p);
          }
        }
      }
    }
    for (var i=0; i < propsToIgnore.length; i++){
      propsToAdd.splice(i,1);
    }
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

function rmPropsFromCGObject(cgName,propsToRemove){
  var numRemoved = 0;
  for (p=0; p< propsToRemove.length; p++){
    var prop = propsToRemove[p];
    var stringToFind = buildSinglePropString(prop);
    for (i=cgName.properties.length-1; i>=0; i--){
      if (buildSinglePropString(cgName.properties[i])===stringToFind){
        var removedProp = cgName.properties.splice(i,1);
        numRemoved += 1;
      }
    }
  }
  if (numRemoved === 0){
    alert("No member properties were removed.");
  }
}

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

function buildSinglePropString(prop){
  var propString = "(\""+prop.matchName+"\")";
  var depth = prop.propertyDepth;
  for (var i=1; i < depth; i++){
    propString = "(\""+prop.parentProperty.matchName+"\")"+ propString;
    prop = prop.parentProperty;
  }
  propString = "layer(\""+prop.parentProperty.name+"\")"+ propString;
  return propString;
}

function buildMainPropString(characterGroup){
  mainPropString = "";
  for (var p = 0; p < characterGroup.properties.length; p++){
    mainPropString += buildSinglePropString(characterGroup.properties[p]);
    if (p < characterGroup.properties.length-1){
      mainPropString += "||";
    }
  }
  return mainPropString;
}

function addKeyToCharacter(cgName){
  try{
    if (cgName.properties.length>0){
      app.beginUndoGroup("Add Key to Character");
      var compName = cgName.comp;
      var compIndex = getCompIndex(compName);
      var currentTime = eval("app.project.item(" + compIndex +").time");
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

function removeKeyFromCharacter(cgName){
  try{
    if(cgName.properties.length>0){
      var compName = cgName.comp;
      var compIndex = getCompIndex(compName);
      var currentTime = eval("app.project.item(" + compIndex +").time");
      for (var i=0; i < cgName.properties.length; i++){
        var prop = cgName.properties[i];
        var nearestIndex = eval("app.project.item(" + compIndex +")." + buildSinglePropString(prop) + ".nearestKeyIndex(" + currentTime +")");
        var keyTime = eval("app.project.item(" + compIndex +")." + buildSinglePropString(prop) + ".keyTime(" + nearestIndex +")");
        var distToKey = Math.abs(currentTime-keyTime);
        //if the key time of that index is greater than zero do something
        if (distToKey < .005){
          eval("app.project.item(" + compIndex +")." + buildSinglePropString(prop) + ".removeKey(" + nearestIndex +")");
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
      //if the key time of that index is greater than zero do something
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
      //if the key time of that index is greater than zero do something
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

function getCharNull(cgName){
  var comps = getComps(app.project)
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

function goToCharNull(cgName){
  var destComp=getCharNull(cgName)[1];
  destComp.openInViewer();
}

function deselectAllProps(targetComp){
  for(var i=0; i < targetComp.selectedProperties.length; i++){
    targetComp.selectedProperties[i].selected = false;
  }
}

function propList(cgName){
  // FOR DEBUGGING ONLY
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
      lbl_key:StaticText{text:'Key',preferredSize:[65,25],justify:'center'},\
      btn_keyAdd:Button{text:'+',preferredSize:[25,25]},\
      btn_keyNext:Button{text:'>',preferredSize:[25,25]},\
    },\
    grp_props:Group{orientation:'row',\
      btn_propSub:Button{text:'-',preferredSize:[25,25]},\
      lbl_prop:StaticText{text:'Property',preferredSize:[65,25],justify:'center'},\
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
dbcgUI.pnl_main.grp_props.btn_propAdd.onClick=function(){
  init();
  addProps(dbcgUI.pnl_main.grp_characterSelect.dwn_charSelect.selection.text,selProps);
};
dbcgUI.pnl_main.grp_props.btn_propSub.onClick=function(){
  init();
  rmProps(dbcgUI.pnl_main.grp_characterSelect.dwn_charSelect.selection.text,selProps);
};

refreshDBCG();
