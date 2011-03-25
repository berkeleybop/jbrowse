
/*  Subclass of FeatureTrack that allows features to be dragged and dropped into the annotation track to create annotations. */
function DraggableFeatureTrack(trackMeta, url, refSeq, browserParams) {
    FeatureTrack.call(this, trackMeta, url, refSeq, browserParams);
    //  console.log("DragableFeatureTrack constructor called");

    var thisObj = this;
    this.featMouseDown = function(event) { thisObj.onFeatureMouseDown(event); };
    this.featDoubleClick = function(event) { thisObj.onFeatureDoubleClick(event); };
    
    // DraggableFeatureTracks all share the same FeatureSelectionManager
    //    if want subclasses to have different selection manager, 
    //    call this.setSelectionManager in subclass (after calling parent constructor)
    this.setSelectionManager(DraggableFeatureTrack.selectionManager);

    // CSS class for selected features
    // override if want subclass to have different CSS class for selected features
    this.selectionClass = "selected-feature";
    
    //  DraggableFeatureTrack.selectionManager.addListener(this);

    this.last_whitespace_mousedown_loc = null;
    this.last_whitespace_mouseup_time = new Date();  // dummy timestamp
    this.prev_selection = null;

    this.verbose = false;
    this.verbose_selection = false;
    this.verbose_selection_notification = false;
    this.verbose_drag = false;
    this.verbose_edges = DraggableFeatureTrack.verbose_edges;

}

// DraggableFeatureTrack.verbose_edges = true;

// Inherit from FeatureTrack
DraggableFeatureTrack.prototype = new FeatureTrack();

// selectionManager is class variable (shared across all DraggableFeatureTrack objects)
DraggableFeatureTrack.selectionManager = new FeatureSelectionManager();

DraggableFeatureTrack.dragging = false;

DraggableFeatureTrack.prototype.setSelectionManager = function(selman)  {
    if (this.selectionManager)  {
	this.selectionManager.removeListener(this);
    }
    this.selectionManager = selman;
    // FeatureSelectionManager listeners must implement 
    //     selectionAdded() and selectionRemoved() response methods
    this.selectionManager.addListener(this);
    return selman;
};

/**
 *   only called once, during track setup ???
 *
 *   doublclick in track whitespace is used by JBrowse for zoom
 *      but WebApollo/JBrowse uses single click in whitespace to clear selection
 *
 *   so this sets up mousedown/mouseup/doubleclick 
 *      kludge to restore selection after a double click to whatever selection was before 
 *      initiation of doubleclick (first mousedown/mouseup)
 * 
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
	    track.last_whitespace_mousedown_loc = [ event.pageX, event.pageY ];
	}
    } );
    $div.bind('mouseup', function(event)  {
	var target = event.target;
	if (! (target.feature || target.subfeature))  {  // event not on feature, so must be on whitespace
	    var xup = event.pageX;
	    var yup = event.pageY;
	    // if click in whitespace without dragging (no movement between mouse down and mouse up, 
	    //    and no shift modifier, 
	    //    then deselect all
	    if (this.verbose_selection)  { console.log("mouse up on track whitespace"); }
	    if (track.last_whitespace_mousedown_loc && 
		xup === track.last_whitespace_mousedown_loc[0] && 
		yup === track.last_whitespace_mousedown_loc[1] && 
		(! event.shiftKey) )  {
		var timestamp = new Date();
		var prev_timestamp = track.last_whitespace_mouseup_time;
		track.last_whitespace_mouseup_time = timestamp;
		// if less than half a second, probably a doubleclick (or triple or more click...)
		var probably_doubleclick = ((timestamp.getTime() - prev_timestamp.getTime()) < 500);
		if (probably_doubleclick)  {
		    if (this.verbose_selection)  { console.log("mouse up probably part of a doubleclick"); }
		    // don't record selection state, want to keep prev_selection set 
		    //    to selection prior to first mouseup of doubleclick
		}
		else {
		    track.prev_selection = track.selectionManager.getSelection();
		    if (this.verbose_selection)  { 
			console.log("recording prev selection"); 
			console.log(track.prev_selection);
		    }
		}
		if (this.verbose_selection)  { console.log("clearing selection"); }
		track.selectionManager.clearSelection();
	    }
	    else   {
		track.prev_selection = null;
	    }
	}
	// regardless of what element it's over, mouseup clears out tracking of mouse down
	track.last_whitespace_mousedown_loc = null;
    } );
    // kludge to restore selection after a double click to whatever selection was before 
    //      initiation of doubleclick (first mousedown/mouseup)
    $div.bind('dblclick', function(event) {
	var target = event.target;
	// because of dblclick bound to features, will only bubble up to here on whitespace, 
	//   but doing feature check just to make sure
	if (! (target.feature || target.subfeature))  { 
	    if (this.verbose_selection)  {
		console.log("double click on track whitespace");
		console.log("restoring selection after double click");
		console.log(track.prev_selection);
	    }
	    if (track.prev_selection)  {
		var plength = track.prev_selection.length;
		// restore selection
		for (var i = 0; i<plength; i++)  { 
		    track.selectionManager.addToSelection(track.prev_selection[i]);
		}
	    }
	}
	track.prev_selection = null;
    } );
};



DraggableFeatureTrack.prototype.selectionAdded = function(feat) {
    var track = this;
    if (feat.track === track)  {  
	var featdiv = track.getFeatDiv(feat);
	if (track.verbose_selection_notification)  {
	    console.log("DFT.selectionAdded called: ");
	    console.log(feat);
	    console.log(featdiv);
	}
	if (featdiv)  {
	    var jq_featdiv = $(featdiv);
	    if (!jq_featdiv.hasClass(track.selectionClass))  {
		jq_featdiv.addClass(track.selectionClass);
	    }
	    //      track.showEdgeMatches(feat); 
	}
    }
};

DraggableFeatureTrack.prototype.selectionCleared = function(selected) {
    var track = this;
    if (track.verbose_selection_notification)  {
	console.log("DFT.selectionCleared called");
    }
    var slength = selected.length;
    for (var i=0; i<slength; i++)  {
	var feat = selected[i];
	track.selectionRemoved(feat);
    }
};

DraggableFeatureTrack.prototype.selectionRemoved = function(feat)  {
    var track = this;
    if (feat.track === track)  {
	var featdiv = track.getFeatDiv(feat);
	if (track.verbose_selection_notification)  {
	    console.log("DFT.selectionRemoved called");
	    console.log(feat);
	    console.log(featdiv);
	}
	if (featdiv)  { 
	    var jq_featdiv = $(featdiv);
	    if (jq_featdiv.hasClass(track.selectionClass))  {
		jq_featdiv.removeClass(track.selectionClass);
	    }
	    if (jq_featdiv.hasClass("ui-draggable"))  {
		jq_featdiv.draggable("destroy");
	    }
	    if (jq_featdiv.hasClass("ui-multidraggable"))  {
		jq_featdiv.multidraggable("destroy");
	    }
	}

    }
};


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
};

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
};


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
    if (this.verbose_selection || this.verbose_drag)  { console.log("DFT.onFeatureMouseDown called"); }
    var ftrack = this;

    // checking for whether this is part of drag setup retrigger of mousedown -- 
    //     if so then don't do selection or re-setup draggability)
    //     this keeps selection from getting confused, 
    //     and keeps trigger(event) in draggable setup from causing infinite recursion 
    //     in event handling calls to featMouseDown
    if (ftrack.drag_create)  { 
	if (this.verbose_selection || this.verbose_drag)  {
	    console.log("DFT.featMouseDown re-triggered event for drag initiation, drag_create: " + ftrack.drag_create);
	    console.log(ftrack);
	}
	ftrack.drag_create = null;
    }
    else  {
	this.handleFeatureSelection(event);
	this.handleFeatureDragSetup(event);
    }

};

DraggableFeatureTrack.prototype.handleFeatureSelection = function(event)  {
    var ftrack = this;
    var selman = ftrack.selectionManager;
    var featdiv = (event.currentTarget || event.srcElement);
    var feat = featdiv.feature;
    if (!feat)  { feat = featdiv.subfeature; }
    var already_selected = selman.isSelected(feat);
    var parent_selected = false;
    var parent = feat.parent;
    if (parent)  {
	parent_selected = selman.isSelected(parent);
    }
    if (this.verbose_selection)  {
	console.log("DFT.handleFeatureSelection() called, actual mouse event");
	console.log(featdiv);
	console.log(feat);
	console.log("already selected: " + already_selected + ",  parent selected: " + parent_selected + 
		    ",  shift: " + (event.shiftKey));
    }
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
	    if (this.verbose_selection)  { console.log("already selected"); }
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
};

DraggableFeatureTrack.prototype.handleFeatureDragSetup = function(event)  {
    var ftrack = this;
    var featdiv = (event.currentTarget || event.srcElement);
    if (this.verbose_drag)  {  console.log(featdiv); }
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
	if (! $featdiv.hasClass("ui-draggable"))  {  
	    if (this.verbose_drag)  { 
		console.log("setting up dragability");
		console.log(featdiv);
	    }
	    $featdiv.draggable(   // draggable() adds "ui-draggable" class to div
		{
		    //  helper: 'clone', 
		    // custom helper for pseudo-multi-drag ("pseudo" because multidrag is visual only -- 
		    //      handling of draggable when dropped is already done through selection)
		    //    strategy for custom helper is to make a "holder" div with same dimensionsas featdiv 
		    //       that's (mostly) a clone of the featdiv draggable is being called on 
		    //       (since draggable seems to like that), 
		    //     then add clones of all selected feature divs (including another clone of featdiv) 
		    //        to holder, with dimensions of each clone recalculated as pixels and set relative to 
		    //        featdiv that the drag is actually initiated on (and thus relative to the holder's 
		    //        dimensions)
		    helper: function() { 
			var $featdiv_copy = $featdiv.clone();
			var $holder = $featdiv.clone();
			$holder.removeClass();
			$holder.addClass("custom-multifeature-draggable-helper"); 
			var holder = $holder[0];
			var featdiv_copy = $featdiv_copy[0];

			var foffset = $featdiv.offset();
			var fheight = $featdiv.height();
			var fwidth = $featdiv.width();
			var ftop = foffset.top;
			var fleft = foffset.left;
			if (this.verbose_drag)  {
			    console.log("featdiv dimensions: ");
			    console.log(foffset); console.log("height: " + fheight + ", width: " + fwidth);
			}
			var selection = ftrack.selectionManager.getSelection();
			var selength = selection.length;
			for (var i=0; i<selength; i++)  {
			    var sfeat = selection[i];
			    var strack = sfeat.track;
			    var sfeatdiv = strack.getFeatDiv(sfeat);
			    // if (sfeatdiv && (sfeatdiv !== featdiv))  {
			    if (sfeatdiv)  {
				var $sfeatdiv = $(sfeatdiv);
				var $divclone = $sfeatdiv.clone();
				var soffset = $sfeatdiv.offset();
				var sheight = $sfeatdiv.height();
				var swidth =$sfeatdiv.width();
				var seltop = soffset.top;
				var sleft = soffset.left;
				$divclone.width(swidth);
				$divclone.height(sheight);
				var delta_top = seltop - ftop;
				var delta_left = sleft - fleft;
				if (this.verbose_drag)  { 
				    console.log(sfeatdiv);
				    console.log("delta_left: " + delta_left + ", delta_top: " + delta_top);
				}
				/*  setting left and top by pixel, based on delta relative to moused-on feature 
				    tried using $divclone.position( { ...., "offset": delta_left + " " + delta_top } );, 
				    but position() not working for negative deltas? (ends up using absolute value)
				    so doing more directly with "left and "top" css calls
				    
				*/
				$divclone.css("left", delta_left);
				$divclone.css("top", delta_top);
				var divclone = $divclone[0];
				holder.appendChild(divclone);
			    }
			}
			if (this.verbose_drag)  { console.log(holder); }
			return holder;
		    }, 

		    opacity: 0.5, 
		    axis: 'y', 
		    create: function(event, ui)  {ftrack.drag_create = true;}
		} ).trigger(event);

	}
    }
};


DraggableFeatureTrack.prototype.onFeatureDoubleClick = function(event)  {
    var ftrack = this;
    // prevent event bubbling up to genome view and triggering zoom
    event.stopPropagation();
    var featdiv = (event.currentTarget || event.srcElement);
    if (this.verbose_selection)  {
	console.log("DFT.featDoubleClick");
	console.log(ftrack);
	console.log(featdiv);
    }

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
};


/**
 *  feature click no-op (to override FeatureTrack.onFeatureClick, which conflicts with mouse-down selection
 */
DraggableFeatureTrack.prototype.onFeatureClick = function(event) {
    // event.stopPropagation();
};

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
};

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
};




/*
  Copyright (c) 2010-2011 Berkeley Bioinformatics Open-source Projects & Lawrence Berkeley National Labs

  This package and its accompanying libraries are free software; you can
  redistribute it and/or modify it under the terms of the LGPL (either
  version 2.1, or at your option, any later version) or the Artistic
  License 2.0.  Refer to LICENSE for the full license text.

*/
