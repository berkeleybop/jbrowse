
/*  Subclass of FeatureTrack that allows features to be dragged and dropped into the annotation track to create annotations. */
function DraggableFeatureTrack(trackMeta, url, refSeq, browserParams) {
    FeatureTrack.call(this, trackMeta, url, refSeq, browserParams);

    var thisObj = this;
    this.featMouseDown = function(event) { thisObj.onFeatureMouseDown(event); }
    this.featDoubleClick = function(event) { thisObj.onFeatureDoubleClick(event); }
    
    // DraggableFeatureTracks all share the same FeatureSelectionManager
    //    if want subclasses to have different selection manager, 
    //    call this.setSelectionManager in subclass (after calling parent constructor)
    this.setSelectionManager(DraggableFeatureTrack.selectionManager);

    // CSS class for selected features
    // override if want subclass to have different CSS class for selected features
    this.selectionClass = "selected-feature";
    
    DraggableFeatureTrack.selectionManager.addListener(this);

    this.current_whitespace_down = null;


}

// Inherit from FeatureTrack
DraggableFeatureTrack.prototype = new FeatureTrack();

// selectionManager is class variable (shared across all DraggableFeatureTrack objects)
DraggableFeatureTrack.selectionManager = new FeatureSelectionManager();

DraggableFeatureTrack.dragging = false;
DraggableFeatureTrack.USE_MULTIDRAG = false;

DraggableFeatureTrack.prototype.setSelectionManager = function(selman)  {
    if (this.selectionManager)  {
	this.selectionManager.removeListener(this);
    }
    this.selectionManager = selman;
    // FeatureSelectionManager listeners must implement 
    //     selectionAdded() and selectionRemoved() response methods
    this.selectionManager.addListener(this);
    return selman;
}

/**
*   only called once, during track setup ???
*/
DraggableFeatureTrack.prototype.setViewInfo = function(genomeView, numBlocks,
						       trackDiv, labelDiv,
						       widthPct, widthPx, scale) {
    FeatureTrack.prototype.setViewInfo.apply(this, [genomeView, numBlocks,
						    trackDiv, labelDiv,
						    widthPct, widthPx, scale]);
    var $div = $(this.div);
    var track = this;

    // setting up mousedown and mouseup handlers to enable click-in-whitespace to clear selection
    //    (without conflicting with JBrowse drag-in-whitespace to scroll)
    $div.bind('mousedown', function(event)  {
	var target = event.target;
	if (! (target.feature || target.subfeature))  {
	    track.current_whitespace_down = [ event.pageX, event.pageY ];
	    console.log(track.current_whitespace_down);
	}
    } );
    $div.bind('mouseup', function(event)  {
	var target = event.target;
	if (! (target.feature || target.subfeature))  {
	    var xup = event.pageX;
	    var yup = event.pageY;
	    // if click in whitespace without dragging (no movement between mouse down and mouse up, 
	    //    and no shift modifier, 
	    //    then deselect all
	    if (track.current_whitespace_down && 
		xup === track.current_whitespace_down[0] && 
		yup === track.current_whitespace_down[1] && 
		(! event.shiftKey) )  {
		track.selectionManager.clearSelection();
	    }
	}
	// regardless of what element it's over, mouseup clears out tracking of mouse down
	track.current_whitespace_down = null;
    } );
    
    console.log("end of DraggableFT.setViewInfo() ");
};



DraggableFeatureTrack.prototype.selectionAdded = function(feat) {
    if (feat.track === this)  {
	// console.log("DFT.selectionAdded(), changing featdiv style");
	var featdiv = this.getFeatDiv(feat);
	if (featdiv)  {
	    var jq_featdiv = $(featdiv);
	    if (!jq_featdiv.hasClass(this.selectionClass))  {
		jq_featdiv.addClass(this.selectionClass);
	    }
	}
	// console.log(featdiv);
	// edge matching turned off for testing other stuff
	//     DraggableFeatureTrack.showEdgeMatches(feat); 
    }
}

DraggableFeatureTrack.prototype.selectionCleared = function(selected) {
//    console.log("called DFT.selectionCleared()");
    var slength = selected.length;
    for (var i=0; i<slength; i++)  {
	var feat = selected[i];
	this.selectionRemoved(feat);
    }
}

DraggableFeatureTrack.prototype.selectionRemoved = function(feat)  {
    if (feat.track === this)  {
	var featdiv = this.getFeatDiv(feat);
//	console.log("DFT.selectionRemoved(), changing featdiv style: ");
	if (featdiv)  { 
	    var jq_featdiv = $(featdiv);
	    if (jq_featdiv.hasClass(this.selectionClass))  {
		jq_featdiv.removeClass(this.selectionClass);
	    }
	    if (jq_featdiv.hasClass("ui-draggable"))  {
		jq_featdiv.draggable("destroy");
	    }
	    if (jq_featdiv.hasClass("ui-multidraggable"))  {
		jq_featdiv.multidraggable("destroy");
	    }

	    // redo edge matching
	    //    $(".left-edge-match").removeClass("left-edge-match");
	    //    $(".right-edge-match").removeClass("right-edge-match");
	}
	// console.log(featdiv);

    }
}




/**
 *  overriding renderFeature to add event handling for mouseover, mousedown, mouseup
 */
DraggableFeatureTrack.prototype.renderFeature = function(feature, uniqueId, block, scale,
							 containerStart, containerEnd) {
    var featdiv = FeatureTrack.prototype.renderFeature.call(this, feature, uniqueId, block, scale,
                                                            containerStart, containerEnd);
    if (featdiv)  {  // just in case featDiv doesn't actually get created
	var $featdiv = $(featdiv);
	// adding pointer to track for each featdiv
	//   (could get this by DOM traversal, but shouldn't take much memory, and having it with each featdiv is more convenient)
	featdiv.track = this;
	// using JQuery bind() will normalize events to W3C spec (don't have to worry about IE inconsistencies, etc.)
	$featdiv.bind("mousedown", this.featMouseDown);
	$featdiv.bind("dblclick", this.featDoubleClick);
    }
    return featdiv;
}

DraggableFeatureTrack.prototype.renderSubfeature = function(feature, featDiv, subfeature,
							    displayStart, displayEnd, block )  {
    // subindex) {
    var subfeatdiv = FeatureTrack.prototype.renderSubfeature.call(this, feature, featDiv, subfeature, 
								  displayStart, displayEnd, block);
    if (subfeatdiv)  {  // just in case subFeatDiv doesn't actually get created
	var $subfeatdiv = $(subfeatdiv);
	// adding pointer to track for each subfeatdiv 
	//   (could get this by DOM traversal, but shouldn't take much memory, and having it with each subfeatdiv is more convenient)
	subfeatdiv.track = this;
	$subfeatdiv.bind("mousedown", this.featMouseDown);
	$subfeatdiv.bind("dblclick", this.featDoubleClick);
    }
    return subfeatdiv;
}


/* 
 *  selection occurs on mouse down
 *  mouse-down on unselected feature -- deselect all & select feature
 *  mouse-down on selected feature -- no change to selection (but may start drag?)
 *  mouse-down on "empty" area -- deselect all 
 *        (WARNING: this is preferred behavior, but conflicts with dblclick for zoom -- zoom would also deselect)  
 *         therefore have mouse-click on empty area deselect all (no conflict with dblclick)
 *  shift-mouse-down on unselected feature -- add feature to selection
 *  shift-mouse-down on selected feature -- remove feature from selection
 *  shift-mouse-down on "empty" area -- no change to selection
 *
 *   "this" should be a featdiv or subfeatdiv
 */
DraggableFeatureTrack.prototype.onFeatureMouseDown = function(event) {
    // event.stopPropagation();
    console.log("DFT.onFeatureMouseDown called");
    var ftrack = this;

    // checking for whether this is part of drag setup retrigger of mousedown -- 
    //     if so then don't do selection or re-setup draggability)
    //     this keeps selection from getting confused, 
    //     and keeps trigger(event) in draggable setup from causing infinite recursion 
    //     in event handling calls to featMouseDown
    if (ftrack.drag_create)  { 
	console.log("DFT.featMouseDown re-triggered event for drag initiation, drag_create: " + ftrack.drag_create);
	console.log(ftrack);
	ftrack.drag_create = null;
    }
    else  {
	this.handleFeatureSelection(event);
	this.handleFeatureDragSetup(event);
    }

}

DraggableFeatureTrack.prototype.handleFeatureSelection = function(event)  {
    var ftrack = this;
    console.log("DFT.handleFeatureSelection() called, actual mouse event");

    var selman = ftrack.selectionManager;
    var featdiv = (event.currentTarget || event.srcElement);
    console.log(featdiv);
    var feat = featdiv.feature;
    if (!feat)  { feat = featdiv.subfeature; }
    console.log(feat);
    var already_selected = selman.isSelected(feat);
    var parent_selected = false;
    var parent = feat.parent;
    if (parent)  {
	parent_selected = selman.isSelected(parent);
    }
    console.log("already selected: " + already_selected + ",  parent selected: " + parent_selected + 
		",  shift: " + (event.shiftKey));
    // if parent is selected, allow propagation of event up to parent,
    //    in order to ensure parent draggable setup and triggering
    // otherwise stop propagation
    if (! parent_selected)  {
	event.stopPropagation();
    }
    if (event.shiftKey)  {
	if (already_selected) {  // if shift-mouse-down and this already selected, deselect this
	    selman.removeFromSelection(feat);
	}
	else if (parent_selected)  {  
	    // if shift-mouse-down and parent selected, do nothing -- 
	    //   event will get propagated up to parent, where parent will get deselected...
	    // selman.removeFromSelection(parent);
	}
	else  {  // if shift-mouse-down and neither this or parent selected, select this
	    // children are auto-deselected by selection manager when parent is selected
	    selman.addToSelection(feat);
	}
    }
    else  {  // no shift modifier
	if (already_selected)  {  // if this selected, do nothing (this remains selected)
	    console.log("already selected");
	}
	else  {
	    if (parent_selected)  {  
		// if this not selected but parent selected, do nothing (parent remains selected)
		//    event will propagate up (since parent_selected), so draggable check 
		//    will be done in bubbled parent event
	    }
	    else  {  // if this not selected and parent not selected, select this
		selman.clearSelection();
		selman.addToSelection(feat);
	    }
	}
    }
}

DraggableFeatureTrack.prototype.handleFeatureDragSetup = function(event)  {
    var ftrack = this;
    var featdiv = (event.currentTarget || event.srcElement);
    console.log(featdiv);
    var feat = featdiv.feature;
    if (!feat)  { feat = featdiv.subfeature; }
    var selected = this.selectionManager.isSelected(feat);

    // only do drag if feature is actually selected
    if (selected)  {
	/** 
	 *  ideally would only make $.draggable call once for each selected div
	 *  but having problems with draggability disappearing from selected divs 
	 *       that $.draggable was already called on
	 *  therefore whenever mousedown on a previously selected div also want to 
	 *       check that draggability and redo if missing 
	 */  
	var $featdiv = $(featdiv);
	if (DraggableFeatureTrack.USE_MULTIDRAG)  {
	    if (! $featdiv.hasClass("ui-multidraggable"))  {  
		console.log("setting up multi-dragability");
		console.log(featdiv);
		$featdiv.multidraggable(   // multidraggable() adds "ui-multidraggable" class to div
		    {helper: 'clone', 
		     opacity: 0.3, 
		     axis: 'y', 
		     create: function(event, ui)  {ftrack.drag_create = true;}
		    } ).trigger(event);
	    }
	}
	else if (! $featdiv.hasClass("ui-draggable"))  {  
	    console.log("setting up dragability");
	    console.log(featdiv);
	    $featdiv.draggable(   // draggable() adds "ui-draggable" class to div
		{
		    helper: 'clone', 
		    /* experimenting for pseudo-multi-drag 
  		       helper: function() { 
		       var holder = document.createElement("div");
		       var seldivs = DraggableFeatureTrack.getSelectedDivs();
		       for (var i in seldivs)  {
		       var featclone = $(seldivs[i]).clone();
		       console.log("drag helper experiment");
		       console.log(holder);
		       console.log(featclone);
		       holder.appendChild(featclone[0]);
		       }
		       //  var featclone = $(featdiv).clone();
		       console.log(holder);
		       return holder;
		       }, 
		    */
		    opacity: 0.5, 
		    axis: 'y', 
		    create: function(event, ui)  {ftrack.drag_create = true;}
		} ).trigger(event);

	}
    }
}


DraggableFeatureTrack.prototype.onFeatureDoubleClick = function(event)  {
    var ftrack = this;
    // prevent event bubbling up to genome view and triggering zoom
    event.stopPropagation();
    console.log("DFT.featDoubleClick");
    console.log(ftrack);

    var featdiv = (event.currentTarget || event.srcElement);
    console.log(featdiv);
    // only take action on double-click for subfeatures 
    //  (but stop propagation for both features and subfeatures)
    // GAH TODO:  make this work for feature hierarchies > 2 levels deep
    var subfeat = featdiv.subfeature;
    if (subfeat)  {
	var selman = ftrack.selectionManager;
	var parent = subfeat.parent;
	// select parent feature
	// children (including subfeat double-clicked one) are auto-deselected in FeatureSelectionManager if parent is selected
	if (parent)  { selman.addToSelection(parent); }
    }
}


/**
 *  feature click no-op (to override FeatureTrack.onFeatureClick, which conflicts with mouse-down selection
 */
DraggableFeatureTrack.prototype.onFeatureClick = function(event) {
    // event.stopPropagation();
}

/** 
 * get highest level feature in feature hierarchy 
 * should be able to handle current two-level feature/subfeature hierarchy 
 *     (including non-feature descendants of feature div, such as arrowhead div)
 *   but also anticipating shift to multi-level feature hierarchy
 *   and/or feature/subfeature elements that have non-feature div descendants, possibly nested
 * elem should be a div for a feature or subfeature, or descendant div of feature or subfeature
 */
/*DraggableFeatureTrack.prototype.getTopLevelFeatureDiv = function(elem)  {
  while (!elem.feature)  {
  elem = elem.parentNode;
  if (elem === document)  {return null;} 
  }
  // found a feature, now crawl up hierarchy till top feature (feature with no parent feature)
  while (elem.parentNode.feature)  {
  elem = elem.parentNode;
  }
  return elem;
  }
*/

/** returns parent feature div of subfeature div */
/*
 *DraggableFeatureTrack.prototype.getParentFeatureDiv = function(elem)  {
 elem = elem.parentNode;
 return DraggableFeatureTrack.prototype.getLowestFeatureDiv(elem);
 }
*/

/** returns first feature or subfeature div (including itself) found when crawling towards root from branch in feature/subfeature/descendants div hierachy  */
DraggableFeatureTrack.prototype.getLowestFeatureDiv = function(elem)  {
    while (!elem.feature && !elem.subfeature)  {
	elem = elem.parentNode;
	if (elem === document)  {return null;} 
    }
    return elem;
}

/**
 *   Near as I can tell, track.showRange is called every time the appearance of the track changes in a way that would 
 *      cause feature divs to be added or deleted
 *   So overriding showRange here to try and map selected features to selected divs and make sure the divs have selection style set
 */
DraggableFeatureTrack.prototype.showRange = function(first, last, startBase, bpPerBlock, scale,
						     containerStart, containerEnd) {
    FeatureTrack.prototype.showRange.call(this, first, last, startBase, bpPerBlock, scale,
					  containerStart, containerEnd);   
    //    console.log("called DraggableFeatureTrack.showRange(), block range: " + 
    //		this.firstAttached +  "--" + this.lastAttached + ",  " + (this.lastAttached - this.firstAttached));
    // redo selection styles for divs in case any divs for selected features were changed/added/deleted
    var sfeats = this.selectionManager.getSelection();
    for (var sin in sfeats)  {
	// only look for selected features in this track -- 
	// otherwise will be redoing (sfeats.length * tracks.length) times instead of sfeats.length times, 
	// because showRange is getting called for each track 
	var sfeat = sfeats[sin];
	if (sfeat.track === this)  {
	    // some or all feature divs are usually recreated in a showRange call
	    //  therefore calling track.selectionAdded() to retrigger setting of selected-feature CSS style, etc. on new feat divs
	    this.selectionAdded(sfeat);
	}
    }
}


/*
// feat may be a feature or subfeature?
// experimenting with highlighting edges of features that match selected features (or their subfeatures) 
DraggableFeatureTrack.showEdgeMatches = function(feat)  {
//	    var ftracks = $("div.track[features]");
console.log("finding feature tracks that match:");
//	    var feat = feature || subfeature;
var first_left_hit = true;
var first_right_hit = true;
// TODO remove hardwiring of min and max index (need track info to do this)
var min = feat[0];
var max = feat[1];
var ftracks = $("div.track").each( function(index, elem)  {
var ftrak = elem.track;
if (ftrak && ftrak.features)  {
var nclist = ftrak.features;
// iterate calls function only for features that overlap min/max coords
nclist.iterate(min, max, function(rfeat, path) {
// TODO remove hardwiring of subfeature index
var subfeats = feat[4];
var rsubfeats = rfeat[4];
if (subfeats instanceof Array && rsubfeats instanceof Array && rsubfeats[0] instanceof Array)  {
//			    console.log("found overlap");
//			    console.log(rfeat);
var id = feat[3];
var rid = rfeat[3];
var rdiv = DraggableFeatureTrack.featToDiv[rid];
var rsubdivs = DraggableFeatureTrack.featToSubDivs[rid];
if (rdiv && rsubdivs)  {
// console.log(rdiv);
// console.log(rsubdivs);
for (var i in subfeats)  {
var sfeat = subfeats[i];
var smin = sfeat[0];
var smax = sfeat[1];
for (var j in rsubfeats)  {
var rfeat = rsubfeats[j];
var rmin = rfeat[0];
var rmax = rfeat[1];
if (smin === rmin)  {
var rsubdiv = rsubdivs[j];
if (rsubdiv)  {
$(rsubdiv).addClass("left-edge-match");
if (first_left_hit)  {
console.log("left match:");
console.log(rfeat);
console.log("left match div: ");
console.log(rsubdiv);
first_left_hit = false;
}
}
}
if (smax === rmax)  {
var rsubdiv = rsubdivs[j];
if (rsubdiv)  {
$(rsubdiv).addClass("right-edge-match");
if (first_right_hit)  {
console.log("right match:");
console.log(rfeat);
console.log("right match div: ");
console.log(rsubdiv);
first_right_hit = false;
}
}

}
}
}
}
}
}, function() {} );  // empty function for no-op on finishing
}
} );
}
*/


/*
  Copyright (c) 2010-2011 Berkeley Bioinformatics Open-source Projects & Lawrence Berkeley National Labs

  This package and its accompanying libraries are free software; you can
  redistribute it and/or modify it under the terms of the LGPL (either
  version 2.1, or at your option, any later version) or the Artistic
  License 2.0.  Refer to LICENSE for the full license text.

*/
